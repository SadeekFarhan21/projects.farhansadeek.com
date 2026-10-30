---
layout: post
title: "Recovering a Scene and Its Lighting Together from Compressed Measurements"
tab_title: Snapshot RAW
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/snapshot-raw-enhance
tags:
  - compressed-sensing
  - sparse-recovery
  - computational-imaging
description: >-
  A compressed-sensing solver that estimates image content and a lighting
  gradient in one problem gains up to 4.7 dB PSNR on textured scenes, loses
  8 dB on a dark one, and the obvious conditioning check for when to trust it
  turned out to point the wrong way.
date: 2026-05-22 10:47:16
---

A camera takes millions of samples and then throws most of them away during compression. Compressed sensing flips that order, measuring a small number of random combinations of pixels and recovering the image by assuming it's sparse. But a raw sensor sees the scene multiplied by its lighting, and uneven lighting destroys the sparsity the recovery relies on. For my ENGS 109 final project I built a recovery that estimates the image and a per-column lighting gain together instead of fixing the lighting afterwards. **On textured scenes the joint recovery beat the usual recover-then-correct pipeline by up to 4.7 dB, and on a mostly dark scene it lost by 8 to 10 dB.** The most useful result was a negative one. I proposed a conditioning check to decide when to use the joint method, tested it, and **the scene where joint recovery failed worst had the best conditioning of all five.**

This was a solo class project at Dartmouth in spring 2026, written in Python with NumPy and PyTorch and run entirely on a CPU. The scale is small on purpose. The joint experiments work on 16×16 patches of five standard test images from scikit-image, and the rate-distortion runs use 64×64 images. Alongside the joint method I implemented OMP, ISTA, FISTA, ADMM and a learned unrolled solver (LISTA), and ran six seeded experiments.

## Why It Matters

The usual pipeline samples every pixel, then compresses by keeping only the large coefficients in some basis such as the DCT, then fixes white balance and exposure on the decoded image. Compressed sensing says that if a signal of length N has only S significant coefficients in a basis, then roughly S·log(N/S) random measurements are enough to recover it by solving an L1-penalized least-squares problem<sup>[[1]](#ref-1)</sup><sup>[[2]](#ref-2)</sup>. That's the premise behind single-pixel cameras and faster MRI.

The catch for a camera is that the sensor doesn't see the scene directly. It sees the scene's reflectance multiplied by an illumination field, $x = s \odot g$. The reflectance $s$ can be sparse in the DCT, but multiplying it by a strong lighting gradient smears its energy across many more coefficients. A sequential pipeline recovers $x$ first, under a sparsity prior that no longer fits, and only then divides out the lighting. The errors from the first step are baked in before the second step runs.

So the question I wanted to answer was whether putting the lighting inside the inverse problem, and asking the solver for reflectance and lighting at once, recovers a better image from the same number of measurements.

## Technical Details

### The Measurement Model

Measurements are $y = Ax + w$, where $A$ is an M×N Gaussian matrix scaled by $1/\sqrt{M}$, and $w$ is Gaussian noise set to a target SNR. The image is sparse in the 2D DCT, $x = \Psi c$, so the standard recovery is the Lasso.

$$
\min_c \tfrac{1}{2} \lVert A \Psi c - y \rVert_2^2 + \lambda \lVert c \rVert_1
$$

The sampling rate is $\delta = M/N$. At $\delta = 0.4$ on a 16×16 patch, that's 102 measurements for 256 pixels.

### Four Classical Solvers

OMP is greedy. It picks the column of $A$ most correlated with the residual, re-solves least squares on every column picked so far, and repeats. ISTA takes a gradient step on the squared error and then soft-thresholds every coefficient toward zero, which is the proximal step for the L1 penalty. FISTA is ISTA with Nesterov momentum<sup>[[3]](#ref-3)</sup>. ADMM splits the problem into a least-squares part and a thresholding part and alternates between them<sup>[[4]](#ref-4)</sup>. All four take the same matrix and measurements, and iteration counts are explicit so they can be compared at the same budget.

### Learning the Iterations

LISTA unrolls ISTA into a fixed number of layers and learns its matrices<sup>[[5]](#ref-5)</sup>. Each ISTA step is $x_{k+1} = \text{soft}(W_t x_k + W_e y, \theta)$ with $W_e = A^\top/L$ and $W_t = I - A^\top A/L$. LISTA initializes $W_e$ and $W_t$ at exactly those values, makes them trainable, and gives each of its 10 layers its own threshold.

```python
self.W_e = nn.Parameter(step * A.T.clone())               # N x M
self.W_t = nn.Parameter(torch.eye(N) - step * (A.T @ A))  # N x N
self.theta = nn.Parameter(torch.full((n_layers,), step * lam_init))

for k in range(self.n_layers):
    x = soft_threshold_torch(self.W_t @ x.T + self.W_e @ y.T, self.theta[k]).T
```

Before training, the network is exactly 10 iterations of ISTA. Training on 5,000 synthetic sparse signals teaches it to get further in those 10 steps.

### The Joint Problem

The joint formulation treats both the DCT coefficients $c$ and a per-column gain vector $g$ as unknowns. The model is that each column of the scene is scaled by its own gain, which is what a horizontal lighting gradient does.

$$
\min_{c,\,g} \tfrac{1}{2} \lVert A \,\mathrm{diag}(g)\, \Psi c - y \rVert_2^2 + \lambda_c \lVert c \rVert_1 + \lambda_g \lVert g \rVert_2^2
$$

The problem isn't convex in both variables at once, but it's easy in each one alone. With $g$ fixed it's a Lasso in $c$ with the sensing matrix modulated by $g$, so FISTA solves it. With $c$ fixed the measurements are linear in $g$, so a small ridge regression solves for it in closed form. The solver alternates the two for 8 rounds.

## Implementation

### The Alternation

The whole joint solver is about 20 lines. The $c$-step builds the effective sensing matrix by scaling each pixel's column of $A$ by its column gain and runs FISTA. The $g$-step sums the sensing matrix against the current scene estimate, column by column, to get a matrix $B$ with one column per image column, then solves the ridge system.

```python
for _ in range(n_outer):
    g_pixel = np.tile(g[None, :], (side, 1)).reshape(-1)
    A_eff = (A_pix * g_pixel[None, :]) @ Psi_T
    c, _ = fista(A_eff, y_noisy, lam=lam_c, n_iters=n_inner_fista)
    scene = synthesize_block(c, Psi_T, side)
    A_resh = A_pix.reshape(A_pix.shape[0], side, side)
    B = (A_resh * scene[None, :, :]).sum(axis=1)
    g = np.linalg.solve(B.T @ B + 1e-2 * np.eye(side), B.T @ y_noisy)
    g = np.maximum(g, 1e-3)
```

The sequential baseline runs FISTA on the raw measurements, estimates the gain as the recovered image's column means, and divides it out.

### Scoring Up to a Scale

The joint problem has a built-in ambiguity. Doubling the scene and halving the gain gives exactly the same measurements, so the solver can land anywhere along that line. Scoring raw PSNR would punish it for an arbitrary choice. Before scoring, both pipelines' outputs are multiplied by the single positive scalar that best fits the ground truth, $a^* = \langle \hat{s}, s \rangle / \lVert \hat{s} \rVert^2$, and clipped to [0, 1]. Applying the same rule to both keeps the comparison fair.

### The Test Setup

Every joint-vs-sequential experiment takes the center 16×16 patch of five images (cameraman, astronaut, coins, page, moon), normalizes it to [0, 1], and multiplies it by a horizontal gradient that ramps from 1 to 8 across the columns. Measurements are taken at 25 dB SNR, and both pipelines are scored against the evenly lit patch, which is what a camera's processing is trying to produce.

## Problems

### 1. LISTA Blowing Up Mid-Training

Training LISTA went smoothly for about 20 epochs, then validation error jumped to around $10^3$ before coming back down near epoch 30. The cause is the recurrence itself. Each layer multiplies the previous estimate by $W_t$, and once training pushes $W_t$'s spectral radius above 1, ten layers of that amplify the estimate instead of shrinking it. **An unrolled solver inherits the stability conditions of the iteration it unrolls**, and plain training doesn't respect them. Gradient clipping at a norm of 1 and restoring the best validation checkpoint (epoch 17) fixed it.

### 2. A Scene With Nothing to Estimate From

The moon patch is mostly black sky. Joint recovery lost 8 to 10 dB on it, and my first explanation was conditioning. The $g$-step solves a system with $B^\top B$, and if most columns carry almost no signal, that matrix should be badly conditioned and the gains impossible to pin down. That suggested a simple gate: compute the condition number $\kappa(B^\top B)$ after the first $c$-step, use the joint method if it's small, and fall back to sequential if it's large.

I tested the gate before trusting it, and it was wrong. **Moon had the lowest $\log_{10}\kappa$ of the five scenes, 1.11, while being the worst case for the joint method by far.** The best threshold over a sweep gave 10.85 dB mean PSNR, against 10.83 dB for always using sequential, because it sent moon to joint and page away from joint, both the wrong way.

The actual mechanism is energy, not conditioning. On a nearly dark patch the first $c$-step returns an estimate close to zero, so $B$ is small in absolute terms even when it's well conditioned, and the noise dominates the ridge solve for $g$. **The gate signal should be the norm of the first scene estimate, $\lVert \hat{s} \rVert_2$, not the condition number.** The sequential pipeline survives moon because it never estimates the lighting from the measurements at all.

## Results

### Joint vs Sequential

Here is the PSNR gain of joint over sequential for each scene, in dB, across sampling rates.

| $\delta$ | cameraman | astronaut | coins | page | moon |
|---|---|---|---|---|---|
| 0.20 | +2.87 | +0.54 | −1.02 | −0.79 | −10.03 |
| 0.30 | +4.65 | +0.18 | −1.73 | −0.48 | −9.51 |
| 0.40 | +1.13 | +1.84 | +0.39 | −0.23 | −7.76 |
| 0.50 | +1.08 | +2.31 | +0.74 | +0.74 | −9.05 |
| 0.60 | +3.07 | +2.21 | +0.32 | +0.43 | −8.37 |

There are three regimes. **Joint wins on the textured scenes**, cameraman by 1.1 to 4.7 dB and astronaut by 0.2 to 2.3 dB, which is the case the method was designed for. Coins and page are mixed at low sampling rates and turn positive once $\delta \ge 0.4$. Moon loses at every rate. Averaged over all five scenes, sequential comes out ahead because moon's losses are so large. Without moon, joint wins at every sampling rate, by 0.4 to 1.5 dB.

### The Learned Solver

At a budget of 10 iterations, LISTA reached a validation NMSE of 0.050, against 0.337 for FISTA and 0.467 for ISTA. **FISTA needs 22 iterations to match what LISTA does in 10.** Fully converged ISTA and FISTA (500 iterations) reach 0.005, so LISTA trades about a factor of 10 in final accuracy for a fixed, small amount of compute.

### The Classical Baselines

The other experiments map out the solvers the joint method is built from. In a 19×19 phase-transition sweep at N = 200 with 20 trials per cell, OMP recovers more at heavy undersampling and FISTA more as measurements increase. At $\delta = 0.3$ OMP's 50%-success boundary sits at a sparsity ratio of 0.35 against FISTA's 0.20, and at $\delta = 0.9$ it's 0.50 against 0.65. On the 64×64 images, FISTA and ADMM beat OMP by 2 to 3 dB at every rate from 0.3 up, and stay within about half a dB of each other since they solve the same problem.

The noise sweep at $\delta = 0.4$ showed where the real limit is. FISTA's PSNR climbs from 10.4 dB at 5 dB SNR to 16.6 dB at 20 dB SNR, then flattens at about 17 dB however clean the measurements get. **Above 20 dB SNR, the fixed DCT basis is the bottleneck, not the noise.**

## What I Would Change

### Gate on Scene Energy

The identifiability experiment points straight at the next step. Computing $\lVert \hat{s} \rVert_2$ after the first $c$-step and falling back to sequential when it's small should keep the textured-scene gains without the moon collapse. That gate still needs the same treatment the conditioning gate got, which is testing it on scenes it wasn't chosen from.

### Real RAW Data and a Smooth Lighting Model

Everything here is synthetic lighting on grayscale test images. The original plan was to use real RAW captures, and the lighting model should be a smooth 2D field rather than one gain per column. Penalizing the gradient of $g$ instead of its size would encode that smoothness directly, and putting LISTA inside the $c$-step would make each alternation cheaper.

## References

1. <span id="ref-1"></span>Candès, Romberg, Tao. *Stable Signal Recovery from Incomplete and Inaccurate Measurements*. Communications on Pure and Applied Mathematics, 2006. [link](https://arxiv.org/abs/math/0503066)
2. <span id="ref-2"></span>Donoho. *Compressed Sensing*. IEEE Transactions on Information Theory, 2006. [link](https://doi.org/10.1109/TIT.2006.871582)
3. <span id="ref-3"></span>Beck, Teboulle. *A Fast Iterative Shrinkage-Thresholding Algorithm for Linear Inverse Problems*. SIAM Journal on Imaging Sciences, 2009. [link](https://doi.org/10.1137/080716542)
4. <span id="ref-4"></span>Boyd, Parikh, Chu, Peleato, Eckstein. *Distributed Optimization and Statistical Learning via the Alternating Direction Method of Multipliers*. Foundations and Trends in Machine Learning, 2011. [link](https://stanford.edu/~boyd/papers/admm_distr_stats.html)
5. <span id="ref-5"></span>Gregor, LeCun. *Learning Fast Approximations of Sparse Coding*. ICML 2010. [link](https://icml.cc/Conferences/2010/papers/449.pdf)
