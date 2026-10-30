import torch
import torch.nn as nn


class LearnablePathFeatureInit(nn.Module):
    """Learnable initialization of higher-dimensional cell features from node features.

    For dimension k, each cell has k+1 constituent nodes at positions 0..k.
    We learn a separate linear transform W_i for each position i, then:
        feat(cell) = sum_i W_i @ feat(node_i)

    This replaces the deterministic scatter-sum/mean with a position-aware
    learnable aggregation.
    """

    def __init__(self, in_features, out_features, max_dim=2):
        super().__init__()
        self.max_dim = max_dim
        self.in_features = in_features
        self.out_features = out_features

        # For each dimension k (1..max_dim), create (k+1) linear transforms
        self.dim_transforms = nn.ModuleDict()
        for dim in range(1, max_dim + 1):
            transforms = nn.ModuleList([
                nn.Linear(in_features, out_features, bias=(pos == 0))
                for pos in range(dim + 1)
            ])
            self.dim_transforms[str(dim)] = transforms

    def forward(self, node_features, cochain, dim):
        """Compute learnable features for a cochain from raw node features.

        Args:
            node_features: [num_nodes, in_features] - dim-0 (node) features.
            cochain: Cochain object with cell_node_index and cell_position_index.
            dim: dimension of this cochain (must be >= 1).

        Returns:
            Tensor of shape [num_cells, out_features].
        """
        cell_node_index = cochain.cell_node_index   # [2, num_entries]
        position_index = cochain.cell_position_index  # [num_entries]
        num_cells = cochain.num_cells

        node_indices = cell_node_index[0]  # which node
        cell_indices = cell_node_index[1]  # which cell

        # Gather node features for all entries: [num_entries, in_features]
        gathered = node_features[node_indices]

        transforms = self.dim_transforms[str(dim)]
        out = torch.zeros(num_cells, self.out_features,
                          device=node_features.device, dtype=node_features.dtype)

        # Apply position-specific linear transforms and scatter-add to cells
        for pos in range(dim + 1):
            mask = (position_index == pos)
            if mask.any():
                pos_features = transforms[pos](gathered[mask])
                out.index_add_(0, cell_indices[mask], pos_features)

        return out
