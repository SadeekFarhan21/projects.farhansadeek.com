"""Solve, learn, compare. Writes results/results.json.

Every number in the write-up comes from this file's output.
"""

import argparse
import json
import time
from multiprocessing import Pool

import numpy as np

from dp import Policy, evaluate, simulate, solve, start_value
from model import Model
from qlearn import greedy_policy, train
from rules import rule_policy, search_rules


def summarize(m, pol, n, seed):
    sim = simulate(m, pol, n=n, seed=seed)
    life_c = sim["consumption"].mean(axis=1)
    offers = sim["offers"].sum(axis=0)
    buys = sim["buys"].sum(axis=0)
    return {
        "mc_utility": float(sim["utility"].mean()),
        "mc_utility_se": float(sim["utility"].std() / np.sqrt(n)),
        "lives_with_shortfall": float((sim["shortfalls"] > 0).mean()),
        "shortfall_years_per_life": float(sim["shortfalls"].mean()),
        "vacation_buy_rate": float(buys[1] / offers[1]),
        "car_buy_rate": float(buys[2] / offers[2]),
        "mean_spend_by_year": sim["spend_by_year"].round(2).tolist(),
        "mean_wealth_by_year": sim["wealth_by_year"].round(1).tolist(),
        "stock_share_by_year": np.nan_to_num(sim["share_by_year"]).round(3).tolist(),
        "lifetime_avg_consumption_p5_p50_p95": np.percentile(life_c, [5, 50, 95]).round(2).tolist(),
        "final_wealth_p5_p50_p95": np.percentile(sim["final_wealth"], [5, 50, 95]).round(1).tolist(),
        "final_wealth_at_grid_cap": float((sim["final_wealth"] >= m.w_grid[-1]).mean()),
    }


def q_run(args):
    seed, n_batches, double = args
    m = Model()
    t0 = time.perf_counter()
    Q, N, curve = train(m, n_batches=n_batches, seed=seed, double=double,
                        log=lambda r: print(f"double={double} seed {seed}", r, flush=True))
    _, act = greedy_policy(m, Q)
    q_own = float(m.interp(Q[0, :, m.p.y0].max(axis=-1), np.array(m.p.w0)) @ m.p_o)
    return act, {
        "seed": seed, "double": double, "seconds": time.perf_counter() - t0, "curve": curve,
        "q_estimate_of_start": q_own, "q_estimate_ce": m.certainty_equivalent(q_own),
        "cells_visited": int((N > 0).sum()), "cells_total": int(N.size),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--q-batches", type=int, default=3000)
    ap.add_argument("--q-seeds", type=int, nargs="+", default=[0, 1])
    ap.add_argument("--sim-lives", type=int, default=100_000)
    ap.add_argument("--out", default="results/results.json")
    args = ap.parse_args()

    m = Model()
    res = {"params": {k: v for k, v in m.p.__dict__.items()},
           "n_states_per_year": int(len(m.w_grid) * len(m.y_vals) * len(m.p_o)),
           "n_actions": int(m.n_actions)}

    t0 = time.perf_counter()
    V, dp_pol, _ = solve(m)
    res["dp_seconds"] = time.perf_counter() - t0
    v_dp = start_value(m, V)
    res["dp"] = {"value": v_dp, "ce": m.certainty_equivalent(v_dp),
                 "check_policy_evaluation": start_value(m, evaluate(m, dp_pol))}

    # What the optimum loses when one choice is taken away.
    masks = {
        "stocks_fixed_50pct": m.shares[m.a_share] == 0.5,
        "no_stocks": m.shares[m.a_share] == 0.0,
        "all_stocks": m.shares[m.a_share] == 1.0,
        "never_buy": m.a_buy == 0,
    }
    res["dp_ablations"] = {}
    for name, mask in masks.items():
        Vm, _, _ = solve(m, allowed=mask)
        res["dp_ablations"][name] = m.certainty_equivalent(start_value(m, Vm))

    rules = {
        "save20_buy_when_affordable": dict(save_rate=0.20, stock_share=0.60, floor=20.0, buy_multiple=1.0),
        "save20_never_buy": dict(save_rate=0.20, stock_share=0.60, floor=20.0, buy_multiple=1e9),
    }
    grid = search_rules(m)
    best = max(grid, key=lambda r: r["value"])
    rules["best_rule_in_grid"] = {k: best[k] for k in ("save_rate", "stock_share", "floor", "buy_multiple")}
    res["rule_grid_size"] = len(grid)
    res["rules"] = {}
    for name, kw in rules.items():
        v = start_value(m, evaluate(m, rule_policy(m, **kw)))
        res["rules"][name] = {"config": kw, "value": v, "ce": m.certainty_equivalent(v)}

    sims = {"dp": dp_pol}
    sims.update({name: rule_policy(m, **kw) for name, kw in rules.items()})

    res["q_learning"], res["double_q_learning"] = [], []
    jobs = [(s, args.q_batches, d) for d in (False, True) for s in args.q_seeds]
    with Pool(len(jobs)) as pool:
        runs = pool.map(q_run, jobs)
    for act, info in runs:
        q_pol = Policy(m.fracs[m.a_frac[act]], m.shares[m.a_share[act]], m.a_buy[act])
        v_q = start_value(m, evaluate(m, q_pol))
        info.update({"value": v_q, "ce": m.certainty_equivalent(v_q)})
        key = "double_q_learning" if info["double"] else "q_learning"
        res[key].append(info)
        sims[f"{key}_seed{info['seed']}"] = q_pol

    res["simulated"] = {name: summarize(m, pol, args.sim_lives, seed=123) for name, pol in sims.items()}

    with open(args.out, "w") as f:
        json.dump(res, f, indent=1, default=float)
    print(json.dumps({k: res[k] for k in ("dp", "dp_ablations", "rules")}, indent=1, default=float))


if __name__ == "__main__":
    main()
