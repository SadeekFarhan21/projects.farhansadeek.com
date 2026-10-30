# Movie Recommendation System (MovieLens 100K)

A compact, end-to-end recommender built for learning and demos. Uses the MovieLens 100K dataset, a PyTorch Matrix Factorization model (plus a simple autoencoder), and a small Streamlit UI for interactive recommendations.

## What this project does (end to end)

- Data source: MovieLens 100K (included under `data/raw/` with official u1–u5 splits).
- Loading: `utils/simple_data_loader.py` reads an official split (default: `u1.base`/`u1.test`) and movie metadata (`u.item`).
- Preprocessing: user/movie ID mapping → dense user–item matrices; optional per-user mean centering for models that need it; artifacts saved to `data/processed/processed_data_u{split}.pkl`.
- Models:
  - Matrix Factorization with user/item embeddings and biases (`models/pytorch/matrix_factorization.py`).
  - Simple autoencoder baseline (`models/pytorch/autoencoder.py`).
- Training: scripts in `models/pytorch/` (`train_mf.py`, `train_autoencoder.py`).
- Evaluation: MSE/MAE on the official test split in `train_mf.py`.
- Serving/UI: `app.py` (Streamlit). For a new session/user, it adapts a fresh user embedding with a few provided ratings (no item re-training) and ranks all movies.

---

## Q&A

### 1) Describe your movie recommender project end to end.
- Load the MovieLens 100K official split (`u1.base`/`u1.test`) and movie metadata.
- Build user/movie index mappings and construct dense user–item matrices (0 = unrated).
- Optionally mean-center per user for models like autoencoders; MF uses raw ratings.
- Train Matrix Factorization (user/item embeddings + biases). Evaluate with MSE/MAE on the test split.
- Serve via Streamlit: user rates a few movies, we adapt a new user embedding+bias quickly (freeze items) and rank all movies for recommendations.

### 2) Why did you choose the MovieLens 100K dataset?
- Standard benchmark with decades of literature; easy to compare.
- Small enough to train quickly on CPU but realistic enough to learn from.
- Clean, official 5-fold splits (u1–u5) avoid leakage and make results reproducible.
- Includes simple metadata (titles + 19 genre flags) for basic content/hybrid ideas.

### 3) What’s the shape and sparsity of the data, and why does that matter?
- Users × Movies: 943 × 1,682; Ratings: 100,000 (~6.3% dense, ~93.7% sparse overall).
- For u1 split: ~80k train (~5.0% dense) and ~20k test (~1.3% dense).
- Why it matters: high sparsity favors collaborative filtering; regularization is key to avoid overfitting; limited content features mean pure content-based has a lower ceiling.

### 4) How did you preprocess the data for training?
- Use official split files; read ratings and `u.item`.
- Create contiguous user/movie index mappings from IDs present in the split.
- Build train/test matrices (zeros = missing ratings).
- Optionally subtract per-user mean from training data (for AE); MF uses raw ratings.
- Save processed artifacts (matrices, mappings, user means, `movies_df`) in `data/processed/`.

### 5) Why collaborative filtering for this problem? Why not content-based?
- CF (Matrix Factorization) models latent interaction patterns and handles extreme sparsity well.
- Content-based here has only 19 binary genre features, which limits expressiveness and ranking quality.
- CF generalizes across users/items without rich item text/images; content is best as a hybrid add-on or for cold start.

### 6) What was the hardest challenge you faced in this project?
- New-user cold start in the app without retraining items.
- Solution: fast per-user adaptation that optimizes only a new user embedding and bias with Smooth L1 loss and light weight decay, while freezing item parameters. Works with just a handful of ratings and keeps the UI responsive.

---

## 📊 Data & Preprocessing (Conceptual)

### Why is the rating matrix ~95% sparse?
- Users rate only a tiny fraction of all movies; ML-100K has ~1.59M user–movie pairs but only 100k ratings.

### What happens if you treat missing ratings as zeros?
- Zero ≠ “unknown”; it biases learning toward low predictions.
- Loss is dominated by zeros; baseline biases shrink and signals wash out.
- Proper approach: train on observed entries (mask) or sample negatives explicitly.

### Why use the official train/test splits instead of random?
- Reproducibility and comparability with published results.
- Balanced folds; avoids subtle leakage and selection bias from ad‑hoc random splits.

### How would your model change if ratings were on a 1–10 scale instead of 1–5?
- Adjust targets/biases/clipping to [1,10] (or normalize to [0,1] then map back).
- Retune learning rate/regularization due to larger variance and gradients.

### Why normalize ratings (e.g., subtract user mean)? What if you don’t?
- Removes per-user rating bias, centers data, improves convergence (notably for AE).
- If skipped, the model must learn large baseline offsets; MF with explicit biases helps but AE benefits from normalization.

### What are the memory trade-offs of dense vs sparse storage for the matrix?
- Dense: simple ops, GPU‑friendly; memory O(U×I) wastes space for ~95% zeros.
- Sparse/triplets: memory O(nonzeros); scales better but needs sparse‑aware ops or sampled training.

---

## 🎯 Recommendation System Concepts

### What’s the difference between collaborative filtering and content-based filtering?
- CF: learns from user–item interactions to discover latent factors; no explicit features required.
- Content-based: uses item/user attributes (e.g., genres) to score similarity; better for cold start.

### Why is matrix factorization effective mathematically for sparse data?
- Ratings are near a low‑rank structure; factorization shares information via low‑dim embeddings with regularization, generalizing to missing entries.

### What are the limitations of collaborative filtering?
- Cold start for new users/items; popularity bias; thin data for tail items; limited interpretability and sensitivity to temporal drift.

### How do you handle cold start users or movies?
- Users: quick onboarding (few ratings), adapt user embedding (this repo), or use demographics/context.
- Items: initialize with metadata (genres), content models, or hybrid CF+content.

### Why do embeddings make sense for users/movies?
- Compact latent representations capturing preferences/attributes; dot products model compatibility in a shared space.

### How do you interpret the learned embeddings?
- Nearest neighbors for similarity; visualize with PCA/t‑SNE/UMAP; correlate dimensions with known metadata.

### How would you adapt your system if you only had implicit feedback (clicks/views) instead of explicit ratings?
- Use implicit MF (weighted ALS), BPR pairwise loss, or sampled softmax.
- Treat interactions as positives with confidence weights; sample negatives; optimize ranking metrics (MAP@K, NDCG).

### Why do neural networks sometimes outperform matrix factorization?
- Model non‑linear interactions and higher‑order crosses; fuse side info easily; better for complex, implicit, and context‑rich scenarios (given enough data and regularization).

---

## How to run

- Prereqs: Python 3.9+ and pip. Dataset is already under `data/raw/`.

- Install dependencies:

```zsh
pip install -r requirements.txt
```

- Train Matrix Factorization (recommended for the app):

```zsh
python models/pytorch/train_mf.py
```

- Optional: train the autoencoder baseline:

```zsh
python models/pytorch/train_autoencoder.py
```

- Launch the Streamlit app:

```zsh
streamlit run app.py
```

Notes:
- The app works without a trained MF checkpoint but uses random weights; train first for meaningful results.
- Processed data is cached in `data/processed/` and reused on subsequent runs.

## Key files

- Data loading: `utils/simple_data_loader.py`
- Matrix Factorization model: `models/pytorch/matrix_factorization.py`
- MF training: `models/pytorch/train_mf.py`
- Autoencoder: `models/pytorch/autoencoder.py`, training at `models/pytorch/train_autoencoder.py`
- UI: `app.py`

## Acknowledgements

- Data: MovieLens 100K (GroupLens Research). https://grouplens.org/datasets/movielens/

---

## 🔥 PyTorch Model (Baseline)

### Describe your PyTorch model. What architecture did you use?
- Biased Matrix Factorization: user/item embeddings (dim=64) + user/item bias + global mean. Prediction: μ + b_u + b_i + <p_u, q_i>.

### Why add user and item bias terms? What happens if you leave them out?
- Biases capture systematic user harshness/kindness and item popularity. Without them, embeddings must explain baselines; convergence slows and accuracy drops.

### Why use MSE loss here? What alternatives exist (MAE, Huber, ranking losses)?
- MSE fits explicit ratings and is smooth for SGD/Adam. Alternatives: MAE (robust, non-smooth), Huber/ Smooth L1 (robust), pairwise ranking (BPR) or listwise (NDCG) for implicit/ranking tasks.

### Why Adam vs SGD? When might plain SGD be better?
- Adam handles sparse, noisy gradients and different scales across params (embeddings/biases). Plain SGD can generalize better with good schedules on very large, well-conditioned datasets.

### How do you prevent overfitting in PyTorch MF?
- L2 weight decay on embeddings/biases, early stopping on validation, limit embedding dim, clamp predictions only for display, and shuffle/minibatch training.

### How do you choose embedding dimension, and trade-offs?
- Small dims (16–32): faster, less overfit, lower capacity. Larger (64–128): higher capacity but needs stronger regularization and data.

### What’s the difference between biased and unbiased MF?
- Unbiased: r̂= <p_u,q_i>. Biased: r̂= μ+b_u+b_i+<p_u,q_i>. Biased separates global/baseline effects from interactions and usually performs better.

### How did your PyTorch model perform compared to baseline predictors?
- Evaluated with MSE/MAE on the official test split in `train_mf.py`. MF beats naive baselines (global mean or user/item mean) by modeling interactions. See script logs for actual metrics.

---

## 🧠 Neural Network From Scratch (Status & Approach)

Note: The scratch NN in `models/scratch/` is a scaffold; core methods are placeholders. Below reflects the intended design rather than completed code.

### How did you implement forward and backward propagation from scratch?
- Plan: define layers with forward() and backward(dout), chain via Sequential; compute gradients analytically per layer and propagate with chain rule.

### How does your Sequential class manage layers in forward/backward?
- Forward: pass output of each layer to next. Backward: iterate layers in reverse, passing upstream gradients.

### How did you implement an embedding layer manually?
- Forward: lookup rows from an embedding matrix via indices. Backward: scatter-add gradients into those rows (accumulating repeats).

### Why is scatter-add needed for embedding gradients?
- Because the same index can appear multiple times in a batch; gradients to that row must sum, not overwrite.

### How did you check correctness of your backprop implementation (gradient checking)?
- Plan: finite-difference checks on small inputs vs analytical grads with tiny epsilon; assert close within tolerance.

### Why cache inputs in forward passes for backward?
- Backward needs intermediates (e.g., inputs to ReLU, means/vars for norm). Caching avoids recomputation and ensures correct gradients.

### Why is gradient accumulation important across batches?
- Needed when simulating large batches or repeated indices (embeddings). Without proper accumulation, updates are biased/incorrect.

### What happens if you don’t accumulate gradients properly?
- Underestimation or overwriting of grads → slow learning, divergence, or collapsed embeddings.

### Why does ReLU work well here? What about sigmoid/tanh?
- ReLU avoids saturation and vanishing grads, trains faster. Sigmoid/tanh can saturate on sparse inputs and slow learning.

### Why bound outputs to [1,5]? What if unbounded?
- For rating display and stability; unbounded outputs can explode and produce unrealistic predictions. For ranking, raw scores can be left unclipped for ordering.

### Why include a global bias term? What happens if you omit it?
- Captures dataset mean rating quickly; without it, other params must absorb the mean, slowing convergence.

### How does initialization affect training stability?
- Small Gaussian/He init for embeddings/linear layers stabilizes early steps; poor init can cause slow or unstable training.

### What happens if gradients vanish or explode? How would you fix it?
- Symptoms: stagnation or divergence. Fixes: better init, ReLU, gradient clipping, normalized inputs, tuned LR/decay.

### Why did your scratch NN plateau after ~20 epochs? What if you trained for 1000?
- Likely optimization/regularization limits, capacity, or LR schedule. Training longer without changes risks overfit or no gains; adjust LR schedule, add regularization, or capacity instead.

### What was the hardest bug you debugged in the scratch NN?
- Common pitfalls: wrong broadcasting in backprop, missing scatter-add, or forgetting to zero/accumulate grads. Status: implementation pending in this repo.

---

## 📈 Training & Performance

### How do you pick learning rate and batch size? What happens if they’re too large or too small?
- Start with LR 1e-3 (Adam), batch 512–2048. Too large: divergence/oscillation; too small: slow, stuck in sharp minima/noise.

### Why use early stopping? How do you detect overfitting?
- Monitor validation loss; stop when it rises for patience window. Prevents waste and overfit.

### Why does batch size impact convergence speed/generalization?
- Larger batches reduce gradient noise (faster per-epoch), may generalize slightly worse; smaller batches add noise that can help escape sharp minima.

### Why does Adam use bias correction? Why is epsilon important?
- Bias correction debiases first/second-moment estimates early. Epsilon prevents division by zero and stabilizes small-variance updates.

### Why might training diverge even with Adam?
- LR too high, no regularization, exploding grads, bad init, or buggy masking (training on zeros as negatives).

### Why is RMSE the main metric here? What if you used top-K metrics instead?
- RMSE targets rating prediction quality. For recommendation lists, use ranking metrics (Precision@K, Recall@K, MAP, NDCG) which better reflect user experience.

### What is the theoretical RMSE floor for ML-100K? Why isn’t it zero?
- Non-zero due to subjective noise, limited features, and stochastic behavior; irreducible error remains.

### How does training vary with different random seeds?
- Affects initialization, shuffling, and sampling → different convergence paths and small metric variance; set seeds for reproducibility.

---

## ⚖️ Comparison & Reflection

### How does the PyTorch MF model compare to your scratch NN?
- MF: concise, optimized, and stable with built-in autograd. Scratch NN: educational, more control/visibility but unfinished here.

### Why does PyTorch MF typically perform better?
- Mature optimizers/autograd, efficient kernels, fewer implementation bugs, and a good inductive bias for sparse ratings.

### What did you learn by reimplementing from scratch that you wouldn’t from PyTorch?
- Deeper understanding of backprop, gradient flow, masking for sparsity, and pitfalls like scatter-add and numerical stability.

### What are the computational/memory trade-offs between PyTorch and scratch implementations?
- PyTorch uses optimized tensor ops and batched kernels; scratch code is slower, harder to vectorize, and more memory-fragile.

### How would you scale your system to MovieLens 1M or Netflix data?
- Use sparse mini-batch sampling, stronger regularization, checkpointing, multiprocessing dataloaders, mixed precision, and consider implicit losses/ranking.

### How do you trade off model accuracy vs interpretability in recommenders?
- MF/linear + biases are more interpretable; deep models often improve accuracy at the cost of transparency; hybrids can balance both.

### How would you extend this project in the future?
- Finish the scratch NN, add ranking losses/metrics, hybridize with content features, add implicit-feedback training, and ship a simple API.