---
layout: post
title: "Mapping 37,700 GitHub Developers, Where Popularity Predicts Follows Better Than Shared Friends"
tab_title: GitHub Network
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/github-social-network
date: 2026-03-04 15:46:48
tags:
  - network-analysis
  - social-networks
  - link-prediction
description: >-
  A network analysis of 37,700 GitHub developers and 289,003 mutual-follow
  edges in R and igraph, where the product of two developers' degrees predicts
  a held-out follow with an AUC of 0.909, ahead of every shared-neighbor score.
---

I took a public graph of 37,700 GitHub developers, where an edge means two people follow each other, and ran the standard toolkit of network analysis over it: degree distributions, centrality, communities, homophily, random-graph baselines and link prediction. The graph is a small world built around a few enormous hubs, and web developers and machine learning engineers mostly follow their own kind even after you correct for there being three times as many web developers. The result that surprised me came last. **To guess whether two developers follow each other, multiplying their follower counts beats every score based on mutual friends**, with an AUC of 0.909 against 0.820 for common neighbors.

This was a solo project in March 2026, done mostly over five days in R with the `igraph` package on a laptop, with a Python pass at the end for link prediction. It follows the methods in Kolaczyk and Csárdi's *Statistical Analysis of Network Data with R*<sup>[[1]](#ref-1)</sup>, chapter by chapter, on a public dataset I didn't collect.

## Why It Matters

A GitHub profile works like a portfolio, and following is how people on GitHub keep track of each other. That makes the follow graph a rough map of who is visible in software. If a few accounts hold most of the connections, visibility is concentrated. If developers mostly follow people in their own specialty, then web and ML developers live in separate neighborhoods even on a shared platform.

The dataset comes from the MUSAE project and is hosted by Stanford's SNAP collection<sup>[[2]](#ref-2)</sup>. It was collected from the GitHub API in June 2019. Nodes are developers who had starred at least 10 repositories, edges are mutual-follower relationships, and each developer carries one label derived from their job title, web developer or machine learning engineer. The authors built it for node classification<sup>[[3]](#ref-3)</sup>. I used it to ask structural questions instead.

## Technical Details

### The Graph Is Sparse and Fully Connected

After loading the edge list and dropping self-loops and duplicates, the graph has 37,700 nodes and 289,003 edges in a single connected component. Its density is 4.07 × 10⁻⁴, which means only about 4 in every 10,000 possible pairs are connected. Yet every developer can reach every other one, and the average shortest path is 3.24 steps.

### Degree Says How Unequal It Is

A node's degree is its number of edges. The median developer here has 6 mutual follows, the mean is 15.33, and the largest hub has 9,458, which is a quarter of the whole network. When the mean is more than twice the median and the maximum is three orders of magnitude above it, a handful of nodes are carrying most of the edges. On a log-log plot of the degree distribution the upper tail looks close to a straight line, which is what a preferential-attachment process produces, though a straight-looking tail alone doesn't prove a power law. All five of the highest-degree developers are labeled web developers.

### Homophily, Measured Against Group Size

Assortativity is a correlation between the attributes at the two ends of every edge. For the job label it comes out at 0.378, so same-type pairs are much more common than chance. But web developers are 74.2% of the nodes, and a raw count of web-web edges would be large even without any preference. The fair comparison divides the edges in each block by the number of pairs that could have existed there.

| Block | Edges | Possible pairs | Edge probability |
|---|---:|---:|---:|
| Web to web | 224,623 | 390,894,780 | 5.75 × 10⁻⁴ |
| ML to ML | 19,684 | 47,419,191 | 4.15 × 10⁻⁴ |
| Web to ML | 44,696 | 272,312,179 | 1.64 × 10⁻⁴ |

**A random web pair is 3.5 times as likely to be connected as a random web-ML pair, and an ML pair is 2.5 times as likely.** The preference for your own specialty survives the correction for the 3-to-1 class split.

Degree assortativity, the same correlation computed on degrees, is slightly negative at -0.075. High-degree developers tend to be connected to low-degree ones, which is the hub-and-spoke shape you'd expect when many people follow a few famous accounts.

### Random Graphs as Baselines

A statistic means more next to a baseline. I generated four random graphs with the same 37,700 nodes. Erdős-Rényi connects pairs uniformly at the observed density. The configuration model keeps every node's exact degree and wires the stubs at random. Watts-Strogatz starts from a ring lattice and rewires a few edges, and Barabási-Albert grows a graph by preferential attachment.

| Model | SD of degree | Transitivity | Average path |
|---|---:|---:|---:|
| GitHub network | 80.79 | 0.0124 | 3.24 |
| Erdős-Rényi | 3.92 | 0.0004 | 4.14 |
| Configuration model | 80.79 | 0.0169 | 3.34 |
| Watts-Strogatz | 1.17 | 0.5052 | 4.25 |
| Barabási-Albert | 19.88 | 0.0027 | 3.65 |

The configuration model is the closest match on both clustering and path length, using nothing but the degree sequence. **Most of what makes this graph look the way it does is explained by who has many follows and who has few.** That observation came back in the link prediction.

### Small World

A network is a small world when its clustering is far higher than a random graph's while its paths stay about as short. The usual score divides the clustering ratio by the path-length ratio against Erdős-Rényi. Here clustering is about 30 times the random baseline and paths are slightly shorter, so the score comes out at 38.7, far above the threshold of 1.

## Implementation

### Building the Graph in R

The source files are an edge list and a table of developer IDs, names and labels. `igraph` needs the vertex key in a column called `name`, so the username moves to its own attribute.

```r
github_graph <- graph_from_data_frame(
  edges,
  directed = FALSE,
  vertices = vertices
) |>
  simplify(remove.multiple = TRUE, remove.loops = TRUE)

degree_all     <- degree(github_graph)
component_info <- components(github_graph)
core_number    <- coreness(github_graph)
```

The report is a Quarto document, so the code, tables and figures live in one file. The expensive steps are exact betweenness and closeness on 37,700 nodes, fast-greedy community detection and generating the null models.

### Communities and Cores

Fast-greedy community detection merges groups greedily to increase modularity, and it found 335 communities with a modularity of 0.396. That's moderate. There is clear structure, with a dense center and many small groups at the edge. The k-core decomposition says the same thing in a different way. The innermost core is the 34-core, 360 developers who each have at least 34 neighbors inside that group. At the other end, 5,236 developers sit in the 1-core and only 28% of the network reaches the 10-core or deeper.

### Link Prediction

Link prediction asks whether the structure of the graph can tell you which missing edges are real. I hid 20% of the edges, sampled the same number of random pairs that are not connected, and scored every pair using only the remaining 80% of the graph. Each score is a classic heuristic.

```python
cn[i] = len(inter)                                  # common neighbors
jc[i] = len(inter) / union_size                     # Jaccard
aa[i] = sum(1.0 / np.log(degree_map[w])             # Adamic-Adar
            for w in inter if degree_map[w] > 1)
pa[i] = degree_map[u] * degree_map[v]               # preferential attachment
same_type[i] = float(ml_target_arr[u] == ml_target_arr[v])
```

The first three count shared neighbors in different ways (Adamic-Adar gives more weight to a shared neighbor who has few connections). Preferential attachment ignores neighborhoods entirely and multiplies the two degrees. A logistic regression stacked on all five scores was trained on 60,000 positive and 60,000 negative pairs from the training graph.

## Results

AUC is the probability that a randomly chosen real edge gets a higher score than a randomly chosen non-edge.

| Score | AUC |
|---|---:|
| Stacked logistic regression | 0.915 |
| Preferential attachment | 0.909 |
| Adamic-Adar | 0.826 |
| Common neighbors | 0.820 |
| Jaccard | 0.786 |
| Same job label | 0.614 |

**Preferential attachment alone gets within 0.006 of the stacked model**, and it beats every neighborhood score by more than 0.08. In the classic link-prediction comparisons on co-authorship networks, shared-neighbor scores like Adamic-Adar do best, because people who share collaborators tend to meet<sup>[[4]](#ref-4)</sup>. In this graph the strongest signal is that people follow popular accounts and popular accounts collect follows, which is the same hub structure the degree distribution and the configuration model already pointed to.

The way the negatives were chosen matters here. Random non-connected pairs are almost always two low-degree developers, because most developers are low-degree, so the degree product separates them from real edges easily. A harder test would draw negatives with the same degree profile as the positives, and I'd expect the neighborhood scores to close some of the gap there.

The job label on its own reaches 0.614. That's well above chance and well below the structural scores, which matches the homophily table. Specialty matters, but it's a weaker force than popularity.

## What I Would Change

### Newer and Longitudinal Data

The graph is a 2019 snapshot, before the recent wave of machine learning work on GitHub, and a single snapshot can't show growth. Two snapshots a year apart would let link prediction be tested on edges that actually formed later, which is the version of the question that matters, instead of edges I hid myself.

### Richer Labels and Edges

Two job categories flatten a lot of people into "web" or "ML", and mutual follows are only one kind of tie. Shared repositories, reviews and issues would give a graph of who works together rather than who watches whom.

## References

<a id="ref-1"></a>[1] E. D. Kolaczyk and G. Csárdi, *Statistical Analysis of Network Data with R*, 2nd ed., Springer, 2020.

<a id="ref-2"></a>[2] J. Leskovec and A. Krevl, "SNAP Datasets: Stanford Large Network Dataset Collection," snap.stanford.edu/data/github-social.html.

<a id="ref-3"></a>[3] B. Rozemberczki, C. Allen and R. Sarkar, "Multi-scale Attributed Node Embedding," arXiv:1909.13021, 2019.

<a id="ref-4"></a>[4] D. Liben-Nowell and J. Kleinberg, "The Link-Prediction Problem for Social Networks," *Journal of the American Society for Information Science and Technology*, 58(7), 2007.
