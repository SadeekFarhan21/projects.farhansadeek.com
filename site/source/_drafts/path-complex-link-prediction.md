---
layout: post
title: "Two Provably Stronger Path Complex Networks That Cora Can't Tell Apart"
tab_title: Path Complexes
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/path-complex-networks
tags:
  - graph-neural-networks
  - topological-deep-learning
  - link-prediction
description: >-
  Two extensions to Path Complex Networks for link prediction, an ordered
  learnable path encoding and a lift that mixes paths with rings, each provably
  at least as expressive as the original, land within 0.002 test AUC of it on
  Cora while the seed alone moves AUC by 0.086.
date: 2026-04-05 13:41:06
---

I took Path Complex Networks, a graph neural network that passes messages between the simple paths of a graph instead of only between its nodes, and adapted it to link prediction. Then I made two changes that the theory says should help. One gives each path an ordered, learned encoding instead of a plain sum of its nodes. The other lets rings (short cycles) live next to paths in the same structure, so a triangle is seen both ways. I proved both changes are at least as expressive as the original model. **On Cora, all four combinations finish within 0.002 test AUC of each other, while changing only the random seed moves a single configuration by 0.086.** The proofs hold, but they don't show up on this benchmark.

This was a spring 2026 research project at Dartmouth's Thayer School, with Sie Hendrata Dharmawan and Peter Chin as co-authors on the paper and poster. I wrote the link-prediction code on top of the public PCN repository by Quang Truong and Peter Chin over about two weeks in April, ran 10 seeds of each configuration on a GPU workstation, and wrote it up as a NeurIPS-format preprint. The graph is small (Cora has 2,708 nodes), and so are the models (428,544 and 703,680 encoder parameters).

## Why It Matters

A standard message-passing GNN updates each node from its neighbors. That family can't tell apart any two graphs that the 1-Weisfeiler-Leman color-refinement test confuses<sup>[[1]](#ref-1)</sup>, and that test misses things as basic as whether a graph is one hexagon or two triangles. Topological GNNs get around the limit by lifting the graph into a bigger object and passing messages between its higher-order pieces. MPSN uses cliques<sup>[[2]](#ref-2)</sup>, CWN uses induced cycles<sup>[[3]](#ref-3)</sup>, and PCN uses simple paths<sup>[[4]](#ref-4)</sup>. Paths are attractive because every connected graph has them, so the lift doesn't assume anything about which substructures matter.

PCN was built and tested for graph classification. Link prediction asks a different question, which is whether two nodes should be connected. The signal for that is mostly closed structure. Papers that share several citations are likely to cite each other, and that shows up as short cycles around the candidate edge. Open paths don't carry it directly, and rings do. So link prediction looked like a good place to test whether PCN's lift leaves anything on the table.

## Technical Details

### A Path Complex

A simple path of length k is an ordered list of k+1 distinct vertices where each neighbor pair is an edge. PCN collects every simple path up to some length into a path complex. Its cells at dimension 0 are nodes, at dimension 1 are edges, and at dimension 2 are two-step paths like A→B→C. The boundary of a path is what you get by deleting its first or last vertex, so A→B→C has boundary cells A→B and B→C.

Message passing then runs over relations between cells. A cell hears from its boundary, and from its upper-adjacent neighbors, which are cells of the same dimension that bound a common higher cell. Two edges are upper-adjacent if some two-step path contains both. Truong and Chin show that boundary and upper-adjacent messages are enough to match the expressivity of the full set of relations<sup>[[4]](#ref-4)</sup>, so I kept that update rule.

### The Starting Feature of a Path Ignores Order

Before any message passing, every higher cell needs an initial feature. In the public PCN code that feature is a scatter-sum (or mean) of the features of the cell's vertices. Sums don't care about order, so A→B→C and C→B→A start out identical. That's odd for an object whose whole identity is an ordering.

The fix I tried gives each position along a path its own linear map. For a path of length k there are k+1 matrices, and the feature is the sum of each node's features multiplied by the matrix for its position.

$$
h_\sigma^{(0)} = \sum_{i=0}^{k} W_i^{(k)} \, x_{v_i}, \qquad \sigma = (v_0, \ldots, v_k)
$$

If every $W_i$ is the same matrix, this collapses to a projection of the old sum, so anything the old model can compute the new one can too. With different matrices it can separate a path from its reverse. In the paper's proof, the path a→b→c with one-hot features gets $Ae_1 + Be_2 + Ce_3$ and its reverse gets $Ae_3 + Be_2 + Ce_1$, which differ whenever $A \ne C$.

### Paths and Rings in One Complex

The second change mixes two lifts. The unified complex keeps every path cell and adds every induced cycle up to length 7 as an extra cell at dimension 2, next to the two-step paths. The two kinds of cell share one table of edges, so a ring ABC and a path A→B→C point at the same edge cells AB and BC.

That sharing is what makes the rings useful. In the path-only complex, the edges AB and AC are upper-adjacent only if some path runs through both. Once the ring ABC exists, all three of its edges bound a common cell, so they all become upper-adjacent and exchange messages directly. Short cycles around a candidate edge are exactly the signal link prediction wants, and this puts them into the message passing.

Because the path cells and their relations are unchanged, the coloring test this complex induces (the paper calls it U-PWL) refines PCN's own test. Restricted to the ring cells it refines CWN's test as well. So the unified model distinguishes at least every pair of graphs that either PCN or CWN can.

## Implementation

### Link Prediction on Top of a Graph-Classification Codebase

The original code expects a dataset of many small graphs with one label each. Link prediction has one graph and labels on edges, so I wrote a new dataset wrapper, trainer, evaluator and model, about 1,500 lines in all.

The wrapper loads Cora through PyTorch Geometric's Planetoid loader and splits edges 85/5/10 into train, validation and test with `RandomLinkSplit`<sup>[[5]](#ref-5)</sup>, following the transductive setup from the variational graph autoencoder paper<sup>[[6]](#ref-6)</sup>, with one sampled negative per positive. Then it builds the complex from the training message-passing edges only.

```python
transform = RandomLinkSplit(**split_kwargs)
train_data, val_data, test_data = transform(data)

# The complex is built from training message-passing edges only
msg_edge_index = train_data.edge_index
self.complex = compute_unified_complex(
    x.numpy(), msg_edge_index.numpy(),
    num_nodes=data.num_nodes, max_k=max_dim,
    max_ring_size=max_ring_size, ...)
```

The encoder is a two-layer PCN with 64-dimensional hidden features. After message passing, the node cells' features are the embeddings, and a dot product with a sigmoid scores each candidate pair. Training uses binary cross-entropy, Adam at a learning rate of 0.01 with plateau decay, and up to 200 epochs with early stopping on validation AUC.

### Position-Aware Initialization

The path builder already knew which node sits in which cell. I extended it to also record each node's position in the cell, and the learnable init uses that to route each node through the matrix for its slot.

```python
gathered = node_features[node_indices]
out = torch.zeros(num_cells, self.out_features, device=..., dtype=...)

for pos in range(dim + 1):
    mask = (position_index == pos)
    if mask.any():
        pos_features = transforms[pos](gathered[mask])
        out.index_add_(0, cell_indices[mask], pos_features)
```

Each node still contributes once to each cell it belongs to, so the cost stays linear in the number of (node, cell) pairs. The only extra work is a matrix multiply per position.

### Building the Unified Complex

The unified builder runs PCN's path enumerator and CWN's ring extractor separately, then stacks the rings after the path cells at dimension 2 and remembers where the rings start. Boundary extraction branches on that index. Path cells drop their first or last vertex, and ring cells return every edge of the cycle.

```python
if path_dim == 2 and cell_id >= ring_start_id:
    cell_boundaries = get_ring_boundaries(cell_tuple)
    cell_boundaries = [b for b in cell_boundaries if b in id_maps[1]]
else:
    cell_boundaries = get_path_boundaries(cell_tuple, cell_tables)
```

Everything downstream, including the adjacency computation and the message-passing layers, runs unchanged on the combined tables. On Cora the unified lift adds 9,709 induced cycles to 38,008 two-step paths, so dimension 2 grows by 26% to 47,717 cells.

### Four Configurations, Ten Seeds

The experiment crosses the two changes, giving four configurations (path or unified, deterministic or learnable). They share every hyperparameter except those two flags, and each one is trained with seeds 0 through 9, so every result below is a mean over ten runs.

## Problems

### 1. Keeping the Test Edges Out of the Topology

Link prediction has a leak that graph classification doesn't. If the lift sees the whole graph, every held-out edge is already sitting inside the complex as an edge cell, and inside every path and ring that runs through it. The model would be scored on edges it was handed as structure. **The complex has to be built from the training message-passing edges alone**, which is why the lift runs after the split and only ever sees `train_data.edge_index`.

### 2. Getting Paths and Rings to Agree on What an Edge Is

The path enumerator came from PCN and the ring extractor from CWN, and they were never meant to share a complex. The ring code names every edge as a sorted pair of vertices, while paths are ordered tuples by nature. If a ring called an edge (A, C) and the edge table only knew it as (C, A), the two cell types would silently live in separate worlds and never exchange a message, and nothing would crash. **Every ring and every path has to look its edges up in one shared id map under the same canonical key**, and that shared map is what makes the unified complex unified.
## Results

| Complex | Init | Val AUC | Test AUC |
|---|---|---|---|
| Path | Deterministic | 0.7344 ± 0.0274 | 0.7113 ± 0.0239 |
| Path | Learnable | 0.7354 ± 0.0230 | 0.7123 ± 0.0164 |
| Unified | Deterministic | 0.7366 ± 0.0270 | 0.7132 ± 0.0165 |
| Unified | Learnable | 0.7335 ± 0.0213 | 0.7111 ± 0.0175 |

Mean ± standard deviation over 10 seeds on Cora.

The unified, deterministic configuration has the best mean test AUC, and the unified, learnable one has the worst, 0.0002 below the baseline. The whole spread of means is 0.0021, and the seed-to-seed standard deviation in every row is between 0.016 and 0.024. **The method changes AUC by about a tenth of what the seed changes it by.** Within one configuration (path, deterministic), seed 6 scored 0.6637 and seed 3 scored 0.7501. With 10 seeds per row, none of these differences is distinguishable from noise.

Two smaller things are worth saying. Both changes lowered the standard deviation from 0.0239 to about 0.016, which might mean they steady training across seeds, though 10 seeds is a thin basis for comparing spreads. And combining both changes did slightly worse than either alone. That's consistent with the two changes overlapping on Cora, and also consistent with noise.

The costs are clearer than the gains.

| Configuration | Lift time (s) | Train epoch (ms) | Encoder parameters |
|---|---|---|---|
| Path, Deterministic | 22.0 | 28.5 | 428,544 |
| Path, Learnable | 22.0 | 37.5 | 703,680 |
| Unified, Deterministic | 62.8 | 33.0 | 428,544 |
| Unified, Learnable | 62.8 | 43.2 | 703,680 |

**The learnable init adds 275,136 parameters (64%) and 32% to each epoch, and the unified lift nearly triples the one-off lift time.** Epoch time grows less than the cell count because most of the message passing happens at dimensions 0 and 1, which the two lifts share.

So the takeaway is narrower than the abstract. An expressivity theorem says a model can separate more graphs, and nothing about whether a given benchmark rewards that. Cora is small and dense with citations, and a test AUC near 0.71 for all four models says the bottleneck is somewhere else. Link-prediction models built for the task, such as SEAL<sup>[[7]](#ref-7)</sup> and NBFNet<sup>[[8]](#ref-8)</sup>, look at the subgraph around the candidate pair directly, and the lift studied here doesn't do that.

## What I Would Change

### Run It Where Cycles Vary

On Cora the gap between path and unified lifts is too small to see. The OGB link-prediction sets, such as ogbl-collab and ogbl-ppa<sup>[[9]](#ref-9)</sup>, are larger and vary more in how much closed structure sits around each pair. That's where a ring signal should either show up or be ruled out, and they'd also give enough test edges to shrink the seed noise.

### Stop Counting Triangles Twice

In the unified complex a triangle ABC is one ring cell and also three path cells (A→B→C, B→C→A, C→A→B). Nothing deduplicates them, so triangles probably get extra weight. A learned gate between cell types would let the model decide how much to listen to each, and it would make the comparison between the two lifts cleaner.

## References

1. <span id="ref-1"></span>Xu, Hu, Leskovec, Jegelka. *How Powerful Are Graph Neural Networks?* ICLR 2019. [link](https://arxiv.org/abs/1810.00826)
2. <span id="ref-2"></span>Bodnar et al. *Weisfeiler and Lehman Go Topological: Message Passing Simplicial Networks*. ICML 2021. [link](https://arxiv.org/abs/2103.03212)
3. <span id="ref-3"></span>Bodnar et al. *Weisfeiler and Lehman Go Cellular: CW Networks*. NeurIPS 2021. [link](https://arxiv.org/abs/2106.12575)
4. <span id="ref-4"></span>Truong, Chin. *Weisfeiler and Lehman Go Paths: Learning Topological Features via Path Complexes*. AAAI 2024. [link](https://arxiv.org/abs/2308.06838)
5. <span id="ref-5"></span>PyG. *RandomLinkSplit*. PyTorch Geometric documentation. [link](https://pytorch-geometric.readthedocs.io/en/latest/generated/torch_geometric.transforms.RandomLinkSplit.html)
6. <span id="ref-6"></span>Kipf, Welling. *Variational Graph Auto-Encoders*. NeurIPS Workshop on Bayesian Deep Learning, 2016. [link](https://arxiv.org/abs/1611.07308)
7. <span id="ref-7"></span>Zhang, Chen. *Link Prediction Based on Graph Neural Networks*. NeurIPS 2018. [link](https://arxiv.org/abs/1802.09691)
8. <span id="ref-8"></span>Zhu et al. *Neural Bellman-Ford Networks*. NeurIPS 2021. [link](https://arxiv.org/abs/2106.06935)
9. <span id="ref-9"></span>Hu et al. *Open Graph Benchmark*. NeurIPS 2020. [link](https://arxiv.org/abs/2005.00687)
