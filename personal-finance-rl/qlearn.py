"""Tabular Q-learning in the same MDP, from simulated lives only.

The agent never sees the transition probabilities. It runs a batch of lives
in lockstep, year by year, and updates Q[t, w, y, o, a] toward
r + discount * max_a' Q[t+1, w', y', o', a'].

With double=True it keeps two tables and, for each sample, picks the next
action with one table and values it with the other (van Hasselt, 2010), which
removes the upward bias of taking a max over noisy estimates.
"""

import numpy as np

from dp import Policy, evaluate, start_value
from model import Model


def greedy_policy(m: Model, Q):
    act = Q.argmax(axis=-1)
    return Policy(m.fracs[m.a_frac[act]], m.shares[m.a_share[act]], m.a_buy[act]), act


def _update(Q, N, flat, target, lr_power):
    """Move each touched cell toward the mean target of the samples that hit it."""
    if flat.size == 0:
        return
    uniq, inv, cnt = np.unique(flat, return_inverse=True, return_counts=True)
    sums = np.bincount(inv, weights=target)
    n_new = N.flat[uniq] + cnt
    alpha = np.minimum(1.0, cnt / n_new ** lr_power)
    old = Q.flat[uniq]
    Q.flat[uniq] = old + alpha * (sums / cnt - old)
    N.flat[uniq] = n_new


def train(m: Model, n_batches=2000, batch=8192, eps_start=1.0, eps_end=0.02,
          lr_power=0.7, init=0.0, eval_every=100, seed=0, double=False, log=print):
    p = m.p
    T = p.horizon
    n_w, n_y, n_o, n_a = len(m.w_grid), len(m.y_vals), len(m.p_o), m.n_actions
    rng = np.random.default_rng(seed)
    tables = [np.full((T, n_w, n_y, n_o, n_a), init, dtype=np.float64) for _ in range(2 if double else 1)]
    counts = [np.zeros(tables[0].shape, dtype=np.int64) for _ in tables]
    cumP = np.cumsum(m.P_y, axis=1)
    frac_a, share_a, buy_a = m.fracs[m.a_frac], m.shares[m.a_share], m.a_buy
    combined = lambda: tables[0] if not double else tables[0] + tables[1]
    curve = []
    for it in range(1, n_batches + 1):
        eps = eps_end + (eps_start - eps_end) * max(0.0, 1.0 - it / (0.8 * n_batches))
        w = m.round_random(np.full(batch, p.w0), rng)
        y = np.full(batch, p.y0)
        o = rng.choice(n_o, size=batch, p=m.p_o)
        for t in range(T):
            q_s = tables[0][t, w, y, o] if not double else tables[0][t, w, y, o] + tables[1][t, w, y, o]
            a = q_s.argmax(axis=1)
            explore = rng.random(batch) < eps
            a = np.where(explore, rng.integers(0, n_a, size=batch), a)
            reward, savings, _, _ = m.cash_flow(m.w_grid[w], y, o, frac_a[a], share_a[a], buy_a[a])
            k = rng.choice(len(m.R), size=batch, p=m.p_R)
            w_next = m.round_random(savings * (1.0 + p.r_free + share_a[a] * (m.R[k] - p.r_free)), rng)
            y_next = (rng.random(batch)[:, None] < cumP[y]).argmax(axis=1)
            o_next = rng.choice(n_o, size=batch, p=m.p_o)
            flat = np.ravel_multi_index((np.full(batch, t), w, y, o, a), tables[0].shape)
            if not double:
                if t + 1 < T:
                    boot = tables[0][t + 1, w_next, y_next, o_next].max(axis=1)
                else:
                    boot = m.terminal(m.w_grid[w_next])
                _update(tables[0], counts[0], flat, reward + p.discount * boot, lr_power)
            else:
                which = rng.random(batch) < 0.5
                for i in (0, 1):
                    sel = which if i == 0 else ~which
                    if t + 1 < T:
                        nxt = (t + 1, w_next[sel], y_next[sel], o_next[sel])
                        a_star = tables[i][nxt].argmax(axis=1)
                        boot = tables[1 - i][nxt][np.arange(sel.sum()), a_star]
                    else:
                        boot = m.terminal(m.w_grid[w_next[sel]])
                    _update(tables[i], counts[i], flat[sel], reward[sel] + p.discount * boot, lr_power)
            w, y, o = w_next, y_next, o_next
        if it % eval_every == 0 or it == n_batches:
            Q = combined()
            pol, _ = greedy_policy(m, Q)
            v = start_value(m, evaluate(m, pol))
            own = Q / len(tables)
            row = {"batch": it, "lives": it * batch, "eps": eps, "value": v,
                   "ce": m.certainty_equivalent(v),
                   "q_start": float(m.interp(own[0, :, p.y0].max(axis=-1), np.array(p.w0)) @ m.p_o),
                   "cells_visited": int(sum(c > 0 for c in counts).astype(bool).sum())}
            curve.append(row)
            log(row)
    N = counts[0] if not double else counts[0] + counts[1]
    return combined() / len(tables), N, curve
