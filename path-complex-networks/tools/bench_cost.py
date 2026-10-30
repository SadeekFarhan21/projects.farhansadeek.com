"""Measure lift time, train epoch time, and parameter count for all four
PCN configurations on Cora link prediction. Prints a LaTeX-ready summary.
"""
import os
import os.path as osp
import time
import sys

sys.path.insert(0, osp.dirname(osp.dirname(osp.abspath(__file__))))

import torch
import torch.nn.functional as F
from torch.optim import Adam

from lib.datasets.link_prediction import LinkPredictionDataset
from models.complex_models.link_prediction_models import LinkPredictionPCN

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
NUM_EPOCHS_BENCH = 20          # average across this many epochs for stable timing
WARMUP_EPOCHS = 3


def build_dataset(complex_type):
    t0 = time.perf_counter()
    ds = LinkPredictionDataset(
        root='./datasets',
        name='Cora',
        complex_type=complex_type,
        max_dim=2,
        init_method='sum',
        val_ratio=0.05,
        test_ratio=0.10,
        neg_sampling_ratio=1.0,
        max_ring_size=7,
    )
    t1 = time.perf_counter()
    return ds, t1 - t0


def count_params(model):
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def train_one_epoch(model, data, opt):
    model.train()
    opt.zero_grad()
    z = model.encode(data.complex)
    out = model.decode(z, data.train_edge_label_index)
    loss = F.binary_cross_entropy_with_logits(out, data.train_edge_label.float())
    loss.backward()
    opt.step()
    return loss.item()


def bench_training(ds, learnable_init):
    torch.manual_seed(0)
    model = LinkPredictionPCN(
        num_input_features=ds.num_features,
        num_layers=2,
        hidden=64,
        dropout_rate=0.3,
        max_dim=2,
        nonlinearity='relu',
        graph_norm='bn',
        conv_type='B',
        decoder_type='dot',
        learnable_init=learnable_init,
    ).to(DEVICE)
    ds.to(DEVICE)
    opt = Adam(model.parameters(), lr=0.01)

    for _ in range(WARMUP_EPOCHS):
        train_one_epoch(model, ds, opt)

    if DEVICE.type == 'cuda':
        torch.cuda.synchronize()
    t0 = time.perf_counter()
    for _ in range(NUM_EPOCHS_BENCH):
        train_one_epoch(model, ds, opt)
    if DEVICE.type == 'cuda':
        torch.cuda.synchronize()
    t1 = time.perf_counter()

    return (t1 - t0) / NUM_EPOCHS_BENCH, count_params(model)


def main():
    print(f'device: {DEVICE}')
    results = []

    for complex_type in ('path', 'unified'):
        ds, lift_time = build_dataset(complex_type)
        print(f'[{complex_type}] lift time: {lift_time:.2f}s')
        print(f'[{complex_type}] cells per dim:', [ds.complex.cochains[d].num_cells for d in range(ds.complex.dimension + 1)])

        for learnable in (False, True):
            epoch_time, n_params = bench_training(ds, learnable)
            label = f"{complex_type}, {'Learn' if learnable else 'Det'}"
            results.append((label, lift_time, epoch_time, n_params))
            print(f'  [{label}] epoch: {epoch_time*1000:.1f} ms, params: {n_params:,}')

    print('\n=== LaTeX ===')
    print('Configuration & Lift time (s) & Train epoch (ms) & Parameters \\\\')
    for label, lt, et, np in results:
        print(f'{label} & {lt:.2f} & {et*1000:.1f} & {np:,} \\\\')


if __name__ == '__main__':
    main()
