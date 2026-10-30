import torch
import os.path as osp

from lib.utils.graph_to_complex import compute_path_complex, compute_unified_complex
from lib.data.datasets import InMemoryComplexDataset
from lib.data.complex import Complex
from torch_geometric.datasets import Planetoid
from torch_geometric.transforms import RandomLinkSplit


class LinkPredictionDataset(object):
    """Dataset wrapper for link prediction on Planetoid graphs (Cora, CiteSeer, PubMed).

    Unlike graph classification datasets, link prediction operates on a single graph.
    Edges are split into train/val/test sets. The path complex is built from training
    edges only, and edge_label_index / edge_label are stored for supervision.
    """

    def __init__(self, root, name, complex_type='path', max_dim=2,
                 include_down_adj=False, init_method='sum', n_jobs=2,
                 val_ratio=0.05, test_ratio=0.10, neg_sampling_ratio=1.0,
                 num_val=None, num_test=None, **kwargs):
        self.name = name
        self._complex_type = complex_type
        self._max_dim = max_dim
        self._include_down_adj = include_down_adj
        self._init_method = init_method
        self._n_jobs = n_jobs

        # Load the Planetoid dataset
        dataset = Planetoid(root=osp.join(root, name), name=name)
        data = dataset[0]

        self.num_features = dataset.num_features
        self.num_nodes = data.num_nodes

        # Split edges into train/val/test
        split_kwargs = dict(
            is_undirected=True,
            neg_sampling_ratio=neg_sampling_ratio,
            add_negative_train_samples=True,
        )
        if num_val is not None and num_test is not None:
            split_kwargs['num_val'] = num_val
            split_kwargs['num_test'] = num_test
        else:
            split_kwargs['num_val'] = val_ratio
            split_kwargs['num_test'] = test_ratio

        transform = RandomLinkSplit(**split_kwargs)
        train_data, val_data, test_data = transform(data)

        # Store edge splits (edge_label_index and edge_label for supervision)
        self.train_edge_label_index = train_data.edge_label_index
        self.train_edge_label = train_data.edge_label
        self.val_edge_label_index = val_data.edge_label_index
        self.val_edge_label = val_data.edge_label
        self.test_edge_label_index = test_data.edge_label_index
        self.test_edge_label = test_data.edge_label

        # Build path complex from training edges (used for message passing)
        # train_data.edge_index contains only the training message-passing edges
        msg_edge_index = train_data.edge_index
        x = train_data.x

        print(f"Building {complex_type} complex for {name} link prediction...")
        print(f"  Nodes: {data.num_nodes}, Training MP edges: {msg_edge_index.size(1)}")
        print(f"  Train supervision edges: {self.train_edge_label_index.size(1)}")
        print(f"  Val edges: {self.val_edge_label_index.size(1)}")
        print(f"  Test edges: {self.test_edge_label_index.size(1)}")

        if complex_type == 'path':
            self.complex = compute_path_complex(
                x.numpy(), msg_edge_index.numpy(),
                edge_attr=None,
                num_nodes=data.num_nodes,
                y=None,
                max_k=max_dim,
                include_down_adj=include_down_adj,
                init_method=init_method,
                init_edges=True,
                init_high_order_paths=True,
            )
        elif complex_type == 'unified':
            max_ring_size = kwargs.get('max_ring_size', 7)
            self.complex = compute_unified_complex(
                x.numpy(), msg_edge_index.numpy(),
                edge_attr=None,
                num_nodes=data.num_nodes,
                y=None,
                max_k=max_dim,
                max_ring_size=max_ring_size,
                include_down_adj=include_down_adj,
                init_method=init_method,
                init_edges=True,
                init_high_order_paths=True,
            )
        else:
            raise ValueError(f"Complex type '{complex_type}' not yet supported for link prediction.")

        print(f"  Complex dimension: {self.complex.dimension}")
        for dim in range(self.complex.dimension + 1):
            print(f"  Dim-{dim} cells: {self.complex.cochains[dim].num_cells}")

    @property
    def max_dim(self):
        return self._max_dim

    def to(self, device):
        """Move all tensors to the specified device."""
        self.complex = self.complex.to(device)
        self.train_edge_label_index = self.train_edge_label_index.to(device)
        self.train_edge_label = self.train_edge_label.to(device)
        self.val_edge_label_index = self.val_edge_label_index.to(device)
        self.val_edge_label = self.val_edge_label.to(device)
        self.test_edge_label_index = self.test_edge_label_index.to(device)
        self.test_edge_label = self.test_edge_label.to(device)
        return self
