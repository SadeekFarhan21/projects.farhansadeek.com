"""Rules of thumb, written as policy tables so they play the same MDP."""

import itertools

import numpy as np

from dp import Policy, evaluate, start_value
from model import Model


def rule_policy(m: Model, save_rate=0.20, stock_share=0.60, floor=20.0, buy_multiple=1.0):
    """Spend (1 - save_rate) of what is left after rent, never less than `floor`,
    hold `stock_share` of savings in stocks, and buy the offered item whenever
    savings are at least `buy_multiple` times its price."""
    p = m.p
    T = p.horizon
    n_w, n_y, n_o = len(m.w_grid), len(m.y_vals), len(m.p_o)
    W = m.w_grid.reshape(n_w, 1, 1)
    Y = m.y_vals.reshape(1, n_y, 1)
    price = m.prices.reshape(1, 1, n_o)
    buy = ((np.arange(n_o) > 0).reshape(1, 1, n_o) & (W >= buy_multiple * price)).astype(int)
    buy = np.broadcast_to(buy, (n_w, n_y, n_o))
    spendable = W + Y - p.rent - np.where(buy > 0, price, 0.0)
    target = np.maximum((1.0 - save_rate) * (Y - p.rent), floor)
    frac = np.clip(target / np.maximum(spendable, 1e-9), 0.0, 1.0)
    frac = np.broadcast_to(frac, (n_w, n_y, n_o))
    tile = lambda a: np.broadcast_to(a, (T, n_w, n_y, n_o)).copy()
    return Policy(tile(frac), tile(np.full((n_w, n_y, n_o), stock_share)), tile(buy))


def search_rules(m: Model):
    """Exact value of every rule in a small grid. Returns a list of dicts."""
    rows = []
    grid = itertools.product(
        [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50],
        [0.0, 0.25, 0.50, 0.60, 0.75, 1.0],
        [10.0, 20.0, 30.0, 40.0],
        [1.0, 2.0, 5.0, 10.0, 20.0, 1e9],
    )
    for save, stock, floor, mult in grid:
        v = start_value(m, evaluate(m, rule_policy(m, save, stock, floor, mult)))
        rows.append({"save_rate": save, "stock_share": stock, "floor": floor,
                     "buy_multiple": mult, "value": v, "ce": m.certainty_equivalent(v)})
    return rows
