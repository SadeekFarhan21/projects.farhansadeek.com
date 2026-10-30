"""Backward induction, exact policy evaluation and simulation.

Every policy (DP, Q-learning, the rules) is a table of actions indexed by
(year, wealth index, income state, offer): a spend fraction, a stock share and
a buy flag. One evaluator and one simulator score them all.
"""

from dataclasses import dataclass

import numpy as np

from model import Model


@dataclass
class Policy:
    frac: np.ndarray    # (T, n_w, n_y, n_o)
    share: np.ndarray
    buy: np.ndarray


def _expected_next(m: Model, V_next):
    """EV(w', y) = sum_y' P(y'|y) sum_o p_o V_next(w', y', o)."""
    over_offers = V_next @ m.p_o                 # (n_w, n_y')
    return over_offers @ m.P_y.T                 # (n_w, n_y)


def _continuation(m: Model, EV, savings, share, y_idx):
    """E over stock outcomes of EV at next wealth; y_idx broadcasts with savings."""
    w_next = m.next_wealth(savings, share)       # (..., n_R)
    lo, wt = m.bracket(w_next)
    y_b = np.broadcast_to(y_idx[..., None], w_next.shape)
    vals = (1.0 - wt) * EV[lo, y_b] + wt * EV[lo + 1, y_b]
    return vals @ m.p_R


def _state_axes(m: Model, extra_dims=0):
    n_w, n_y, n_o = len(m.w_grid), len(m.y_vals), len(m.p_o)
    tail = (1,) * extra_dims
    W = m.w_grid.reshape(n_w, 1, 1, *tail)
    Y = np.arange(n_y).reshape(1, n_y, 1, *tail)
    O = np.arange(n_o).reshape(1, 1, n_o, *tail)
    return W, Y, O


def solve(m: Model, allowed=None):
    """Exact backward induction. Returns (V, Policy, action index) with V of shape
    (T+1, n_w, n_y, n_o). `allowed` is an optional boolean mask over actions,
    for asking what the optimum looks like with some choices taken away."""
    p = m.p
    T = p.horizon
    n_w, n_y, n_o = len(m.w_grid), len(m.y_vals), len(m.p_o)
    V = np.zeros((T + 1, n_w, n_y, n_o))
    V[T] = m.terminal(m.w_grid)[:, None, None]
    act = np.zeros((T, n_w, n_y, n_o), dtype=np.int64)

    W, Y, O = _state_axes(m, extra_dims=1)
    F = m.fracs[m.a_frac].reshape(1, 1, 1, -1)
    S = m.shares[m.a_share].reshape(1, 1, 1, -1)
    B = m.a_buy.reshape(1, 1, 1, -1)
    reward, savings, _, _ = m.cash_flow(W, Y, O, F, S, B)
    shape = np.broadcast_shapes(reward.shape, savings.shape)
    reward = np.broadcast_to(reward, shape)
    savings = np.broadcast_to(savings, shape)
    share = np.broadcast_to(S, shape)
    y_idx = np.broadcast_to(Y, shape)

    for t in range(T - 1, -1, -1):
        EV = _expected_next(m, V[t + 1])
        Q = reward + p.discount * _continuation(m, EV, savings, share, y_idx)
        if allowed is not None:
            Q = np.where(allowed, Q, -np.inf)
        act[t] = Q.argmax(axis=-1)
        V[t] = Q.max(axis=-1)

    pol = Policy(m.fracs[m.a_frac[act]], m.shares[m.a_share[act]], m.a_buy[act])
    return V, pol, act


def evaluate(m: Model, pol: Policy):
    """Exact expected discounted utility of a fixed policy. Returns V (T+1, n_w, n_y, n_o)."""
    p = m.p
    T = p.horizon
    n_w, n_y, n_o = len(m.w_grid), len(m.y_vals), len(m.p_o)
    V = np.zeros((T + 1, n_w, n_y, n_o))
    V[T] = m.terminal(m.w_grid)[:, None, None]
    W, Y, O = _state_axes(m)
    for t in range(T - 1, -1, -1):
        reward, savings, _, _ = m.cash_flow(W, Y, O, pol.frac[t], pol.share[t], pol.buy[t])
        shape = (n_w, n_y, n_o)
        savings = np.broadcast_to(savings, shape)
        share = np.broadcast_to(pol.share[t], shape)
        EV = _expected_next(m, V[t + 1])
        V[t] = reward + p.discount * _continuation(m, EV, savings, share, np.broadcast_to(Y, shape))
    return V


def start_value(m: Model, V):
    """Value at year 0 from (w0, y0), averaged over the first year's offer."""
    v0 = m.interp(V[0][:, m.p.y0, :], np.array(m.p.w0))
    return float(v0 @ m.p_o)


def simulate(m: Model, pol: Policy, n=100_000, seed=0):
    """Monte Carlo lives under a policy. Common random numbers via the seed."""
    p = m.p
    T = p.horizon
    rng = np.random.default_rng(seed)
    w = m.round_random(np.full(n, p.w0), rng)
    y = np.full(n, p.y0)
    o = rng.choice(len(m.p_o), size=n, p=m.p_o)
    total = np.zeros(n)
    out = {
        "share_by_year": np.zeros(T), "spend_by_year": np.zeros(T),
        "wealth_by_year": np.zeros(T), "buys": np.zeros((n, len(m.p_o))),
        "offers": np.zeros((n, len(m.p_o))), "shortfalls": np.zeros(n),
        "consumption": np.zeros((n, T)),
    }
    cumP = np.cumsum(m.P_y, axis=1)
    for t in range(T):
        f, s, b = pol.frac[t, w, y, o], pol.share[t, w, y, o], pol.buy[t, w, y, o]
        wv = m.w_grid[w]
        reward, savings, bought, short = m.cash_flow(wv, y, o, f, s, b)
        total += p.discount ** t * reward
        cash = wv + m.y_vals[y] - p.rent - np.where(bought, m.prices[o], 0.0)
        out["consumption"][:, t] = cash - savings
        out["share_by_year"][t] = np.mean(np.where(savings > 0, s, np.nan)[savings > 0]) if np.any(savings > 0) else 0.0
        out["spend_by_year"][t] = np.mean(cash - savings)
        out["wealth_by_year"][t] = np.mean(wv)
        np.add.at(out["offers"], (np.arange(n), o), 1)
        np.add.at(out["buys"], (np.arange(n), o), bought.astype(float))
        out["shortfalls"] += short
        k = rng.choice(len(m.R), size=n, p=m.p_R)
        w_next = savings * (1.0 + p.r_free + s * (m.R[k] - p.r_free))
        w = m.round_random(w_next, rng)
        y = (rng.random(n)[:, None] < cumP[y]).argmax(axis=1)
        o = rng.choice(len(m.p_o), size=n, p=m.p_o)
    total += p.discount ** T * m.terminal(m.w_grid[w])
    out["utility"] = total
    out["final_wealth"] = m.w_grid[w]
    return out
