# personal-finance-rl

A small life-cycle personal finance problem, posed as a finite-horizon MDP and
solved three ways: exactly with backward induction, from simulated lives with
tabular Q-learning (plain and double), and with rules of thumb ("save 20 percent, buy the
vacation when you can afford it").

The problem follows the course-project topic of Stanford's CME 241
(Foundations of Reinforcement Learning with Applications in Finance, Ashwin
Rao): grow wealth from salary and investments, pay fixed obligations, and
decide which optional purchases are worth it, to maximize expected lifetime
utility of consumption.

## The model

Money is in thousands of dollars a year, over a 30-year working life.

| Piece | Choice |
| --- | --- |
| Salary | Markov chain over unemployed 15, low 50, mid 80, high 120 |
| Obligation | Rent of 24 every year |
| Optional purchases | Each year: nothing (50%), a vacation costing 6 (35%), a car costing 30 (15%) |
| Assets | Bond at 2%; stock returning -25%, +7% or +30% with probability 0.2, 0.5, 0.3 |
| Utility | CRRA with risk aversion 2, discount 0.96; purchases add a one-off bonus |
| Retirement | Wealth left at year 30 is spread over 10 more years of consumption |
| Floor | If cash after rent falls below 5, consumption is 5 that year (a shortfall) |

State is (year, wealth, salary state, offer), with wealth on a 120-point grid.
Actions are a spending fraction (12 levels), a stock share (0, 25, 50, 75 or
100 percent) and buy or skip, 120 in all.

Next-year wealth is rounded to a neighbouring grid point at random, with the
probabilities that keep its expectation exact. The MDP is therefore finite,
backward induction is exact on it, and Q-learning interacts with the same MDP
rather than an approximation of it. Any policy written as a table of actions
can be scored exactly by backward policy evaluation, which is how every number
in the results is produced; Monte Carlo is used only for path statistics.

## Files

| File | What it does |
| --- | --- |
| `model.py` | Parameters, grids, utility, and the one cash-flow function every policy uses |
| `dp.py` | Backward induction, exact policy evaluation, simulation |
| `rules.py` | Rule-of-thumb policies and a grid search over 1,296 of them |
| `qlearn.py` | Tabular Q-learning and Double Q-learning over batches of simulated lives |
| `checks.py` | Grid-size and purchase-bonus robustness checks, written to `results/checks.json` |
| `run_all.py` | Runs everything and writes `results/results.json` |
| `make_charts.py` | Turns the results into the blog's chart specs |

Requires Python 3.10+ and NumPy.

```
python3 run_all.py
python3 checks.py
python3 make_charts.py
```
