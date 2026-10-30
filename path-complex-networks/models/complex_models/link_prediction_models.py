import torch
import torch.nn.functional as F
from torch.nn import Linear
from torch_geometric.nn.inits import reset

from lib.layers.cin_conv import SparseCINConv
from lib.layers.learnable_features import LearnablePathFeatureInit
from lib.data.complex import ComplexBatch
from lib.layers.non_linear import get_nonlinearity
from lib.layers.norm import get_graph_norm

from torch_geometric.nn import JumpingKnowledge


class LinkPredictionPCN(torch.nn.Module):
    """Path Complex Network for link prediction.

    This model uses the same PCN message-passing encoder as SparseCIN but
    outputs node-level embeddings instead of graph-level predictions.
    An edge decoder (dot product or MLP) scores candidate edges.
    """

    def __init__(self,
                 num_input_features,
                 num_layers,
                 hidden,
                 dropout_rate: float = 0.5,
                 in_dropout_rate: float = 0.0,
                 max_dim: int = 2,
                 jump_mode=None,
                 nonlinearity='relu',
                 train_eps=False,
                 use_coboundaries=False,
                 use_boundaries=False,
                 include_down_adj=False,
                 graph_norm='bn',
                 num_layers_update=2,
                 num_layers_combine=1,
                 conv_type="B",
                 decoder_type='dot',
                 learnable_init=False):
        super(LinkPredictionPCN, self).__init__()

        self.max_dim = max_dim
        self.jump_mode = None if jump_mode == 'None' else jump_mode
        self.in_dropout_rate = in_dropout_rate
        self.dropout_rate = dropout_rate
        self.decoder_type = decoder_type
        self.learnable_init = learnable_init

        # Initialize convs, non-linear act. function, and graph norm
        self.convs = torch.nn.ModuleList()
        self.nonlinearity = nonlinearity
        self.graph_norm = get_graph_norm(graph_norm)
        act_module = get_nonlinearity(nonlinearity, return_module=True)

        # Input projection: project features at each dim to hidden
        # For dim 0 (nodes), always use a linear projection
        self.input_projs = torch.nn.ModuleList()
        self.input_projs.append(Linear(num_input_features, hidden))

        if learnable_init:
            # Learnable per-position transforms for dims >= 1
            self.learnable_feat_init = LearnablePathFeatureInit(
                num_input_features, hidden, max_dim=max_dim)
        else:
            self.learnable_feat_init = None
            # Standard linear projections for dims >= 1
            for _ in range(max_dim):
                self.input_projs.append(Linear(num_input_features, hidden))

        # Add SparseCINConv layers
        for i in range(num_layers):
            self.convs.append(
                SparseCINConv(
                    up_msg_size=hidden, down_msg_size=hidden,
                    boundary_msg_size=hidden, passed_msg_boundaries_nn=None,
                    passed_msg_up_nn=None, passed_msg_down_nn=None,
                    passed_update_up_nn=None, passed_update_down_nn=None,
                    passed_update_boundaries_nn=None, train_eps=train_eps,
                    max_dim=self.max_dim, hidden=hidden, act_module=act_module,
                    layer_dim=hidden, graph_norm=self.graph_norm,
                    use_coboundaries=use_coboundaries, use_boundaries=use_boundaries,
                    include_down_adj=include_down_adj,
                    num_layers_update=num_layers_update,
                    num_layers_combine=num_layers_combine,
                    conv_type=conv_type)
            )

        # Jumping Knowledge
        self.jump = JumpingKnowledge(self.jump_mode) if self.jump_mode is not None else None

        # MLP decoder (only used when decoder_type='mlp')
        if decoder_type == 'mlp':
            jk_dim = num_layers * hidden if self.jump_mode == 'cat' else hidden
            self.edge_mlp = torch.nn.Sequential(
                Linear(2 * jk_dim, hidden),
                torch.nn.ReLU(),
                torch.nn.Dropout(dropout_rate),
                Linear(hidden, 1)
            )

    def reset_parameters(self):
        for proj in self.input_projs:
            proj.reset_parameters()
        for conv in self.convs:
            conv.reset_parameters()
        if self.jump_mode is not None:
            self.jump.reset_parameters()
        if self.learnable_feat_init is not None:
            for transforms in self.learnable_feat_init.dim_transforms.values():
                for t in transforms:
                    t.reset_parameters()
        if self.decoder_type == 'mlp':
            reset(self.edge_mlp)

    def encode(self, data):
        """Run message passing and return node embeddings (dim-0 features).

        Args:
            data: A Complex or ComplexBatch object.

        Returns:
            Node embedding tensor of shape [num_nodes, hidden].
        """
        # Save original features so we can restore them (important for single-graph
        # link prediction where the same complex is reused across epochs)
        return_dim = min(self.max_dim, data.dimension)
        original_xs = [data.cochains[dim].x for dim in range(return_dim + 1)]

        # Project features at each dimension to hidden
        xs = []
        # Dim 0 (nodes): always use linear projection
        node_x = data.cochains[0].x
        x0 = self.input_projs[0](node_x)
        x0 = F.dropout(x0, p=self.in_dropout_rate, training=self.training)
        xs.append(x0)

        # Dims >= 1: use learnable init or standard projection
        for dim in range(1, return_dim + 1):
            cochain = data.cochains[dim]
            if self.learnable_feat_init is not None \
                    and cochain.cell_node_index is not None:
                x_dim = self.learnable_feat_init(node_x, cochain, dim)
            elif dim < len(self.input_projs) and cochain.x is not None:
                x_dim = self.input_projs[dim](cochain.x)
            else:
                x_dim = None
            if x_dim is not None:
                x_dim = F.dropout(x_dim, p=self.in_dropout_rate, training=self.training)
            xs.append(x_dim)
        data.set_xs(xs)

        jump_xs = None
        for conv in self.convs:
            params = data.get_all_cochain_params(max_dim=self.max_dim, include_down_features=False)
            xs = conv(*params, start_to_process=0)
            data.set_xs(xs)

            if self.jump_mode is not None:
                if jump_xs is None:
                    jump_xs = [[] for _ in xs]
                for i, x in enumerate(xs):
                    jump_xs[i] += [x]

        if self.jump_mode is not None:
            node_emb = self.jump(jump_xs[0])
        else:
            node_emb = xs[0]  # dim-0 features = node embeddings

        # Restore original features
        data.set_xs(original_xs)

        return node_emb

    def decode(self, z, edge_label_index):
        """Decode edge scores from node embeddings.

        Args:
            z: Node embeddings of shape [num_nodes, hidden].
            edge_label_index: Edge indices of shape [2, num_edges] to score.

        Returns:
            Edge scores of shape [num_edges].
        """
        src = z[edge_label_index[0]]
        dst = z[edge_label_index[1]]

        if self.decoder_type == 'dot':
            return (src * dst).sum(dim=-1)
        elif self.decoder_type == 'mlp':
            edge_feat = torch.cat([src, dst], dim=-1)
            return self.edge_mlp(edge_feat).squeeze(-1)
        else:
            raise ValueError(f"Unknown decoder type: {self.decoder_type}")

    def forward(self, data, edge_label_index):
        """Full forward pass: encode + decode.

        Args:
            data: A Complex or ComplexBatch object.
            edge_label_index: Edge indices to score, shape [2, num_edges].

        Returns:
            Edge scores of shape [num_edges].
        """
        z = self.encode(data)
        return self.decode(z, edge_label_index)

    def __repr__(self):
        return self.__class__.__name__
