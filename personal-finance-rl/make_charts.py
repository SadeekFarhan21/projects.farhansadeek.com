"""Turn results/results.json into the blog's chart specs."""

import json
import os
import sys

OUT = "../site/source/data/projects/personal-finance-rl"
SRC = "personal-finance-rl/run_all.py (results/results.json)"


def money_k(x):
    return round(x * 1000)


def main(path="results/results.json"):
    r = json.load(open(path))
    os.makedirs(OUT, exist_ok=True)
    q = r["q_learning"][0]
    dq = r["double_q_learning"][0]
    dp_ce = r["dp"]["ce"]
    rules = r["rules"]
    best = rules["best_rule_in_grid"]["config"]

    rows = [
        ("Backward induction (optimal)", dp_ce, True, "Exact optimum of the MDP"),
        (f"Tabular Q-learning, {q['curve'][-1]['lives'] / 1e6:.1f}M simulated lives", q["ce"], True,
         f"{100 * (q['ce'] / dp_ce - 1):.1f}% versus optimal"),
        (f"Double Q-learning, same {dq['curve'][-1]['lives'] / 1e6:.1f}M lives", dq["ce"], True,
         f"{100 * (dq['ce'] / dp_ce - 1):.1f}% versus optimal"),
        ("Best rule in a 1,296-rule grid", rules["best_rule_in_grid"]["ce"], False,
         f"Save {best['save_rate']:.0%}, {best['stock_share']:.0%} stocks, {100 * (rules['best_rule_in_grid']['ce'] / dp_ce - 1):.1f}% versus optimal"),
        ("Save 20%, never buy extras", rules["save20_never_buy"]["ce"], False,
         f"{100 * (rules['save20_never_buy']['ce'] / dp_ce - 1):.1f}% versus optimal"),
        ("Save 20%, buy extras when affordable", rules["save20_buy_when_affordable"]["ce"], False,
         f"{100 * (rules['save20_buy_when_affordable']['ce'] / dp_ce - 1):.1f}% versus optimal"),
    ]
    json.dump({
        "type": "bars", "format": "money", "unit": "Certainty-equivalent consumption per year",
        "title": "The Optimal Plan Is Worth 29 Percent More Than Saving 20 Percent",
        "subtitle": "Exact expected lifetime utility of each policy, as the constant yearly spending that feels the same",
        "legendLabels": {"emphasis": "Solved or learned", "other": "Rule of thumb"},
        "rows": [{"label": l, "value": money_k(v), "emphasis": e, "detail": d} for l, v, e, d in rows],
        "caption": "Every policy is scored by exact policy evaluation in the same 30-year MDP, so the differences carry no Monte Carlo noise.",
        "source": SRC,
    }, open(f"{OUT}/personal-finance-rl-policies.json", "w"), indent=1)

    json.dump({
        "type": "series", "format": "money", "unit": "Certainty-equivalent consumption per year",
        "xFormat": "number", "xLabel": "Simulated lives seen by Q-learning, millions",
        "title": "Q-Learning Stalls Below a Tuned Rule of Thumb",
        "subtitle": "Greedy Q-learning policy scored exactly every 100 batches of 8,192 lives",
        "entities": [
            {"name": "Q-learning (greedy policy)",
             "points": [{"x": round(c["lives"] / 1e6, 2), "value": money_k(c["ce"])} for c in q["curve"]]},
            {"name": "Double Q-learning (greedy policy)",
             "points": [{"x": round(c["lives"] / 1e6, 2), "value": money_k(c["ce"])} for c in dq["curve"]]},
            {"name": "Backward induction",
             "points": [{"x": round(c["lives"] / 1e6, 2), "value": money_k(dp_ce)} for c in q["curve"]]},
            {"name": "Best rule in the grid",
             "points": [{"x": round(c["lives"] / 1e6, 2), "value": money_k(rules["best_rule_in_grid"]["ce"])} for c in q["curve"]]},
        ],
        "caption": "Seed 0 of each method. Exploration falls linearly to 2 percent over the first 80 percent of training. Double Q-learning has honest value estimates and a worse policy.",
        "source": SRC,
    }, open(f"{OUT}/personal-finance-rl-q-curve.json", "w"), indent=1)

    sim = r["simulated"]
    years = range(1, len(sim["dp"]["mean_spend_by_year"]) + 1)
    json.dump({
        "type": "series", "format": "money", "unit": "Mean yearly spending",
        "xFormat": "number", "xLabel": "Working year",
        "title": "The Optimal Plan Keeps Raising Spending as Wealth Builds",
        "subtitle": "Mean ordinary spending by year over 100,000 simulated lives, excluding vacations and cars",
        "entities": [
            {"name": name, "points": [{"x": y, "value": money_k(v)} for y, v in zip(years, sim[key]["mean_spend_by_year"])]}
            for name, key in [("Backward induction", "dp"), ("Save 20%, buy when affordable", "save20_buy_when_affordable")]
        ],
        "caption": "The rule ties spending to salary alone, so it never spends down what it has saved.",
        "source": SRC,
    }, open(f"{OUT}/personal-finance-rl-spending.json", "w"), indent=1)
    print("wrote charts to", OUT)


if __name__ == "__main__":
    main(*sys.argv[1:])
