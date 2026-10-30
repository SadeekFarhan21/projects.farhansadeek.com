"""
Link Prediction on the MUSAE GitHub Social Network (igraph)
============================================================
This script performs link prediction on the full GitHub developer network
using the python-igraph package with both heuristic and ML approaches.

Methods:
  1. Heuristic Scores: Common Neighbors, Jaccard, Adamic-Adar, Preferential Attachment
  2. Homophily (same developer type)
  3. Logistic Regression on combined heuristic features

Dataset: MUSAE GitHub (37,700 nodes, 289,003 edges)
"""

import os
import time
import numpy as np
import pandas as pd
import igraph as ig
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, roc_curve, classification_report
from sklearn.preprocessing import StandardScaler

# ── Configuration ──────────────────────────────────────────────────────
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
PLOTS_DIR = os.path.join(DATA_DIR, "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)
SEED = 42
TEST_RATIO = 0.2
NEG_RATIO = 1.0

np.random.seed(SEED)

# ── 1. Load the Data ──────────────────────────────────────────────────
print("=" * 60)
print("LINK PREDICTION — MUSAE GitHub Network (igraph)")
print("=" * 60)

print("\n[1] Loading data...")
edges_df = pd.read_csv(os.path.join(DATA_DIR, "musae_git_edges.csv"))
target_df = pd.read_csv(os.path.join(DATA_DIR, "musae_git_target.csv"))

# Build igraph Graph
# Nodes are 0-indexed integers — create graph with the right number of vertices
n_nodes = target_df["id"].max() + 1
G = ig.Graph(n=n_nodes, edges=list(zip(edges_df["id_1"], edges_df["id_2"])),
             directed=False)

# Remove multi-edges and self-loops
G.simplify()

# Attach ml_target as a vertex attribute
ml_targets = [0] * n_nodes
for _, row in target_df.iterrows():
    ml_targets[row["id"]] = row["ml_target"]
G.vs["ml_target"] = ml_targets

print(f"  Nodes: {G.vcount():,}")
print(f"  Edges: {G.ecount():,}")
print(f"  Density: {G.density():.6f}")

# ── 2. Train/Test Split (Edge-level) ─────────────────────────────────
print("\n[2] Splitting edges into train/test...")

all_edges = G.get_edgelist()
np.random.shuffle(all_edges)

n_test = int(len(all_edges) * TEST_RATIO)
test_edges_pos = all_edges[:n_test]
train_edges = all_edges[n_test:]

# Build the training graph (remove test edges)
G_train = G.copy()

# Find edge IDs to delete
eids_to_remove = []
for u, v in test_edges_pos:
    eid = G_train.get_eid(u, v, error=False)
    if eid != -1:
        eids_to_remove.append(eid)

G_train.delete_edges(eids_to_remove)

# Check for isolated nodes
isolated = [v.index for v in G_train.vs if G_train.degree(v) == 0]
if isolated:
    print(f"  Warning: {len(isolated)} isolated nodes after edge removal")

print(f"  Train edges: {len(train_edges):,}")
print(f"  Test edges (positive): {len(test_edges_pos):,}")
print(f"  Training graph: {G_train.vcount():,} nodes, {G_train.ecount():,} edges")

# ── 3. Negative Sampling ─────────────────────────────────────────────
print("\n[3] Sampling negative edges...")

n_neg = int(len(test_edges_pos) * NEG_RATIO)
existing_edges = set((min(u, v), max(u, v)) for u, v in G.get_edgelist())
seen = set()
test_edges_neg = []

while len(test_edges_neg) < n_neg:
    u = np.random.randint(0, n_nodes)
    v = np.random.randint(0, n_nodes)
    if u == v:
        continue
    edge = (min(u, v), max(u, v))
    if edge in existing_edges or edge in seen:
        continue
    seen.add(edge)
    test_edges_neg.append((u, v))

print(f"  Test edges (negative): {len(test_edges_neg):,}")

# Training negatives
train_neg = []
while len(train_neg) < len(train_edges):
    u = np.random.randint(0, n_nodes)
    v = np.random.randint(0, n_nodes)
    if u == v:
        continue
    edge = (min(u, v), max(u, v))
    if edge in existing_edges or edge in seen:
        continue
    seen.add(edge)
    train_neg.append((u, v))

# ── 4. Heuristic Scores (igraph) ────────────────────────────────────
print("\n[4] Computing heuristic link prediction scores...")


def common_neighbors_score(g, edge_list):
    """Number of common neighbors for each (u, v) pair."""
    scores = []
    for u, v in edge_list:
        nbrs_u = set(g.neighbors(u))
        nbrs_v = set(g.neighbors(v))
        scores.append(len(nbrs_u & nbrs_v))
    return np.array(scores, dtype=float)


def jaccard_coefficient(g, edge_list):
    """Jaccard coefficient: |N(u) ∩ N(v)| / |N(u) ∪ N(v)|."""
    scores = []
    for u, v in edge_list:
        nbrs_u = set(g.neighbors(u))
        nbrs_v = set(g.neighbors(v))
        union = len(nbrs_u | nbrs_v)
        scores.append(len(nbrs_u & nbrs_v) / union if union > 0 else 0.0)
    return np.array(scores, dtype=float)


def adamic_adar_index(g, edge_list):
    """Adamic-Adar: sum of 1/log(degree(w)) for common neighbors w."""
    scores = []
    for u, v in edge_list:
        nbrs_u = set(g.neighbors(u))
        nbrs_v = set(g.neighbors(v))
        common = nbrs_u & nbrs_v
        score = 0.0
        for w in common:
            deg_w = g.degree(w)
            if deg_w > 1:
                score += 1.0 / np.log(deg_w)
        scores.append(score)
    return np.array(scores, dtype=float)


def preferential_attachment(g, edge_list):
    """Preferential attachment: degree(u) * degree(v)."""
    degrees = g.degree()
    scores = [degrees[u] * degrees[v] for u, v in edge_list]
    return np.array(scores, dtype=float)


def same_type_score(g, edge_list):
    """Homophily score: 1 if both nodes share the same ml_target, else 0."""
    ml = g.vs["ml_target"]
    scores = [1.0 if ml[u] == ml[v] else 0.0 for u, v in edge_list]
    return np.array(scores, dtype=float)


def compute_all_scores(g, edge_list, label=""):
    """Compute all heuristic scores for an edge list."""
    if label:
        print(f"    {label} ({len(edge_list):,} pairs)...")
    cn = common_neighbors_score(g, edge_list)
    jc = jaccard_coefficient(g, edge_list)
    aa = adamic_adar_index(g, edge_list)
    pa = preferential_attachment(g, edge_list)
    return cn, jc, aa, pa


# Compute scores on test set
t0 = time.time()
cn_pos, jc_pos, aa_pos, pa_pos = compute_all_scores(
    G_train, test_edges_pos, "Test positives")
cn_neg, jc_neg, aa_neg, pa_neg = compute_all_scores(
    G_train, test_edges_neg, "Test negatives")
print(f"  Done in {time.time() - t0:.1f}s")

# Combine test scores
cn_all = np.concatenate([cn_pos, cn_neg])
jc_all = np.concatenate([jc_pos, jc_neg])
aa_all = np.concatenate([aa_pos, aa_neg])
pa_all = np.concatenate([pa_pos, pa_neg])
y_true = np.concatenate([np.ones(len(test_edges_pos)),
                         np.zeros(len(test_edges_neg))])

# ── 5. Evaluate Individual Heuristics ─────────────────────────────────
print("\n[5] Heuristic AUC Scores")
print("-" * 40)

heuristics = {
    "Common Neighbors": cn_all,
    "Jaccard Coefficient": jc_all,
    "Adamic-Adar": aa_all,
    "Preferential Attachment": pa_all,
}

auc_results = {}
for name, scores in heuristics.items():
    auc = roc_auc_score(y_true, scores)
    auc_results[name] = auc
    print(f"  {name:<25s} AUC = {auc:.4f}")

# ── 6. Homophily Feature ─────────────────────────────────────────────
print("\n[6] Homophily-based prediction...")

homo_pos = same_type_score(G, test_edges_pos)
homo_neg = same_type_score(G, test_edges_neg)
homo_all = np.concatenate([homo_pos, homo_neg])

auc_homo = roc_auc_score(y_true, homo_all)
auc_results["Homophily (same type)"] = auc_homo
print(f"  Homophily (same type)    AUC = {auc_homo:.4f}")

# ── 7. ROC Curves Plot ───────────────────────────────────────────────
print("\n[7] Plotting ROC curves...")

fig, ax = plt.subplots(figsize=(8, 6))
colors = ["#2196F3", "#F44336", "#4CAF50", "#FF9800", "#9C27B0"]

all_scores = {**heuristics, "Homophily": homo_all}
for (name, scores), color in zip(all_scores.items(), colors):
    fpr, tpr, _ = roc_curve(y_true, scores)
    auc_val = roc_auc_score(y_true, scores)
    ax.plot(fpr, tpr, color=color, lw=2,
            label=f"{name} (AUC={auc_val:.3f})")

ax.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.5)
ax.set_xlabel("False Positive Rate", fontsize=12)
ax.set_ylabel("True Positive Rate", fontsize=12)
ax.set_title("ROC Curves — Link Prediction (GitHub Network)", fontsize=14)
ax.legend(loc="lower right", fontsize=10)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(PLOTS_DIR, "link_prediction_roc.png"), dpi=300)
plt.savefig(os.path.join(PLOTS_DIR, "link_prediction_roc.pdf"))
print(f"  Saved: plots/link_prediction_roc.png")

# ── 8. Logistic Regression on Combined Features ──────────────────────
print("\n[8] Logistic Regression on combined heuristic features...")

X_test = np.column_stack([cn_all, jc_all, aa_all, pa_all, homo_all])
feature_names = ["Common Neighbors", "Jaccard", "Adamic-Adar",
                 "Pref. Attachment", "Homophily"]

# Compute training features (subsample for tractability)
print("  Computing training features...")
t0 = time.time()

n_train_sample = min(len(train_edges), 100_000)
idx_pos = np.random.choice(len(train_edges), n_train_sample, replace=False)
train_pos_sample = [train_edges[i] for i in idx_pos]
train_neg_sample = train_neg[:n_train_sample]

cn_tr_p, jc_tr_p, aa_tr_p, pa_tr_p = compute_all_scores(
    G_train, train_pos_sample, "Train positives")
cn_tr_n, jc_tr_n, aa_tr_n, pa_tr_n = compute_all_scores(
    G_train, train_neg_sample, "Train negatives")

homo_tr_p = same_type_score(G, train_pos_sample)
homo_tr_n = same_type_score(G, train_neg_sample)

X_train = np.column_stack([
    np.concatenate([cn_tr_p, cn_tr_n]),
    np.concatenate([jc_tr_p, jc_tr_n]),
    np.concatenate([aa_tr_p, aa_tr_n]),
    np.concatenate([pa_tr_p, pa_tr_n]),
    np.concatenate([homo_tr_p, homo_tr_n]),
])
y_train = np.concatenate([np.ones(len(train_pos_sample)),
                          np.zeros(len(train_neg_sample))])

print(f"  Training features computed in {time.time() - t0:.1f}s")
print(f"  Train samples: {len(y_train):,}  |  Test samples: {len(y_true):,}")

# Scale and fit
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

lr = LogisticRegression(max_iter=1000, random_state=SEED)
lr.fit(X_train_sc, y_train)

y_prob = lr.predict_proba(X_test_sc)[:, 1]
auc_lr = roc_auc_score(y_true, y_prob)

print(f"\n  Logistic Regression AUC = {auc_lr:.4f}")
print("\n  Feature coefficients:")
for name, coef in zip(feature_names, lr.coef_[0]):
    print(f"    {name:<20s}  {coef:+.4f}")

# Classification report at 0.5 threshold
y_pred = (y_prob >= 0.5).astype(int)
print("\n  Classification Report:")
print(classification_report(y_true, y_pred, target_names=["No Edge", "Edge"],
                            digits=4))

# ── 9. Final Comparison Plot ─────────────────────────────────────────
print("\n[9] Final comparison plot...")

fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# ROC with LR
ax = axes[0]
fpr_lr, tpr_lr, _ = roc_curve(y_true, y_prob)
for (name, scores), color in zip(all_scores.items(), colors):
    fpr, tpr, _ = roc_curve(y_true, scores)
    auc_val = roc_auc_score(y_true, scores)
    ax.plot(fpr, tpr, color=color, lw=1.5, alpha=0.6,
            label=f"{name} ({auc_val:.3f})")

ax.plot(fpr_lr, tpr_lr, color="black", lw=2.5,
        label=f"Logistic Regression ({auc_lr:.3f})")
ax.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.3)
ax.set_xlabel("False Positive Rate")
ax.set_ylabel("True Positive Rate")
ax.set_title("ROC Curves — All Methods")
ax.legend(loc="lower right", fontsize=9)
ax.grid(True, alpha=0.3)

# Bar chart of AUCs
ax = axes[1]
all_aucs = {**auc_results, "Logistic Regression": auc_lr}
names = list(all_aucs.keys())
aucs = list(all_aucs.values())
bar_colors = colors + ["#333333"]

bars = ax.barh(names, aucs, color=bar_colors, edgecolor="white", height=0.6)
ax.set_xlim(0.45, 1.0)
ax.set_xlabel("AUC Score")
ax.set_title("Link Prediction — AUC Comparison")
for bar, auc in zip(bars, aucs):
    ax.text(auc + 0.005, bar.get_y() + bar.get_height() / 2,
            f"{auc:.4f}", va="center", fontsize=10)
ax.grid(True, axis="x", alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(PLOTS_DIR, "link_prediction_comparison.png"), dpi=300)
plt.savefig(os.path.join(PLOTS_DIR, "link_prediction_comparison.pdf"))
print(f"  Saved: plots/link_prediction_comparison.png")

# ── 10. Summary Table ────────────────────────────────────────────────
print("\n" + "=" * 60)
print("LINK PREDICTION RESULTS SUMMARY")
print("=" * 60)
print(f"{'Method':<30s} {'AUC':>8s}")
print("-" * 40)
for name, auc in sorted(all_aucs.items(), key=lambda x: -x[1]):
    print(f"  {name:<28s} {auc:.4f}")
print("-" * 40)
print(f"\nTest set: {len(test_edges_pos):,} positive + "
      f"{len(test_edges_neg):,} negative edges")
print(f"Training graph: {G_train.vcount():,} nodes, "
      f"{G_train.ecount():,} edges")
print(f"\nLibrary: python-igraph {ig.__version__}")
print("=" * 60)
