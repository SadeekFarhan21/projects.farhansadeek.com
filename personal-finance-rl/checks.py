"""Two robustness checks. Writes results/checks.json.

1. Grid: does a finer or wider wealth grid move the answers?
2. Purchase bonuses: the one hand-set part of the model. Halve and double them
   and see which conclusions survive.
"""

import json
from dataclasses import replace

import numpy as np

from dp import evaluate, solve, start_value
from model import Model, Params
from rules import rule_policy


def ce_of(m, pol):
    return m.certainty_equivalent(start_value(m, evaluate(m, pol)))


def buy_threshold(m, pol, t, y, o):
    """Lowest wealth from which the policy buys item o at every higher wealth."""
    no = np.where(pol.buy[t, :, y, o] == 0)[0]
    if len(no) == 0:
        return 0.0
    if no.max() + 1 >= len(m.w_grid):
        return None
    return float(m.w_grid[no.max() + 1])


def main():
    out = {"grid": [], "bonus_scale": []}
    for n_w, w_max in [(120, 3000.0), (240, 3000.0), (170, 6000.0)]:
        m = Model(Params(n_wealth=n_w, w_max=w_max))
        V, _, _ = solve(m)
        out["grid"].append({"n_wealth": n_w, "w_max": w_max,
                            "dp_ce": m.certainty_equivalent(start_value(m, V)),
                            "save20_ce": ce_of(m, rule_policy(m))})
    base = Params()
    for scale in (0.5, 1.0, 2.0):
        p = replace(base, equiv=tuple(scale * e for e in base.equiv))
        m = Model(p)
        V, pol, _ = solve(m)
        Vn, _, _ = solve(m, allowed=m.a_buy == 0)
        row = {
            "scale": scale,
            "dp_ce": m.certainty_equivalent(start_value(m, V)),
            "dp_never_buy_ce": m.certainty_equivalent(start_value(m, Vn)),
            "save20_buy_ce": ce_of(m, rule_policy(m)),
            "save20_never_buy_ce": ce_of(m, rule_policy(m, buy_multiple=1e9)),
            "low_earner_year1_threshold": {
                "vacation": buy_threshold(m, pol, 0, 1, 1), "car": buy_threshold(m, pol, 0, 1, 2)},
            "low_earner_year21_threshold": {
                "vacation": buy_threshold(m, pol, 20, 1, 1), "car": buy_threshold(m, pol, 20, 1, 2)},
            "high_earner_year1_threshold": {
                "vacation": buy_threshold(m, pol, 0, 3, 1), "car": buy_threshold(m, pol, 0, 3, 2)},
        }
        row["value_of_purchases_to_dp"] = row["dp_ce"] - row["dp_never_buy_ce"]
        row["cost_of_buying_when_affordable"] = row["save20_never_buy_ce"] - row["save20_buy_ce"]
        out["bonus_scale"].append(row)
    with open("results/checks.json", "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
