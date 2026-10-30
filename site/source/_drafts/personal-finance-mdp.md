---
layout: post
title: "Solving a Personal Finance MDP, Where When to Buy Matters More Than How Much to Save"
tab_title: Finance MDP
date: 2026-10-30 10:02:31
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/personal-finance-rl
tags:
  - reinforcement-learning
  - dynamic-programming
  - personal-finance
description: >-
  A 30-year personal finance MDP solved exactly with backward induction and
  learned with Q-learning. The optimal plan is worth 29 percent more than
  "save 20 percent, buy it when you can afford it", and most of that gap is the
  buying rule.
---

"Save 20 percent and buy the vacation when you can afford it" sounds like two pieces of advice. In a small life-cycle model I built and solved exactly, they are worth very different amounts. The optimal plan delivers the same lifetime utility as spending a steady **$35,573 a year**, against **$27,595** for the rule, and simply never buying the optional extras lifts the rule to $31,522. The savings rate was the smaller problem. **The "when you can afford it" half costs about nine times what well-timed purchases are worth to the optimal plan.**

The model is a finite-horizon Markov decision process over a 30-year working life: a salary that moves between four states, fixed rent, savings split between a bond and a stock, and a vacation or a car offered at random. I solve it three ways. Backward induction gives the exact optimum in about two seconds on a laptop. Tabular Q-learning learns from 24.6 million simulated lives and reaches $29,401, enough to beat the 20% rule but short of the best rule of thumb. A grid of 1,296 rules of thumb shows how far careful tuning gets without solving anything.

## Why It Matters

The topic comes from the course project in Stanford's CME 241, Ashwin Rao's class on reinforcement learning in finance<sup>[[1]](#ref-1)</sup>. The prompt is personal finance optimization. You earn a salary, pay obligations like rent, invest what is left, and every so often face an optional purchase that would make you happier. The goal is to maximize the expected sum of utility of consumption while not knowing how your career will go.

It is a good problem for this toolkit because the uncertainty is real (jobs end, markets fall) and the decisions interact. A car bought this year is a buffer you don't have when you lose your job next year. Personal finance advice tends to handle each decision separately with a rule, and an MDP is the cleanest way I know to measure what that separation costs.

It is also small enough to solve exactly, which is the part I cared about most. When the true optimum is known, an RL agent's score is a measured gap instead of a story, and a rule of thumb can be graded against the best possible answer rather than against another rule.

## Technical Details

### The Model

Money is in thousands of dollars a year. Each year the household sees its salary and whether an optional purchase is on offer, then decides three things at once: what fraction of its cash to spend, what share of its savings to hold in stocks, and whether to buy the offered item.

| Piece | Choice |
| --- | --- |
| Horizon | 30 working years, discount factor 0.96 |
| Salary | Markov chain over unemployed $15K, low $50K, mid $80K, high $120K, starting low |
| Obligation | Rent of $24K a year |
| Offers | Each year nothing (50%), a $6K vacation (35%) or a $30K car (15%) |
| Assets | A bond paying 2%; a stock returning −25%, +7% or +30% with probability 0.2, 0.5, 0.3 |
| Utility | CRRA with risk aversion 2; a purchase adds a one-off bonus |
| Retirement | Wealth at year 30 is spread over 10 more years of consumption |
| Floor | If cash after rent drops below $5K, the household lives on $5K that year (a shortfall) |

The stock has a 7.5% mean return and a 19% standard deviation, roughly an equity index. A job ends with probability 3 to 5% a year, and unemployment is sticky once it starts.

Utility of consumption $c$ is CRRA<sup>[[2]](#ref-2)</sup>,

$$
u(c) = \frac{c^{1-\gamma}}{1-\gamma}, \qquad \gamma = 2,
$$

so a dollar matters a lot more at $20K a year than at $80K. Dropping from $45K to $5K for one year costs sixteen times as much utility as rising from $45K to $90K gains. Each optional purchase adds a fixed bonus equal to the utility gain of $12K (vacation) or $45K (car) of extra spending at a $50K lifestyle. Those two bonuses are the made-up part of the model. They are set so a purchase is clearly worth it for a comfortable household and clearly not for a stretched one, which is exactly the decision the course project is about.

Results are reported as **certainty-equivalent consumption**: the constant yearly spending, over the 30 working years and 10 retirement years, that gives the same expected discounted utility as the policy. It turns a utility like −0.579 into a number a person can feel.

### Making the MDP Exact

The state is (year, wealth, salary state, offer). Wealth lives on a 120-point grid, spaced quadratically from $0 to $3M so it is fine near zero, where rent and the floor bite. Actions are 12 spending fractions, 5 stock shares (0 to 100 percent in quarters) and buy or skip, 120 in all. That gives 1,440 states a year and 120 actions in each.

Next year's wealth after the market moves almost never lands on a grid point. The usual fix is to interpolate the value function, which turns the solver into an approximation of a continuous problem. I did something slightly different. **Next-year wealth is rounded to one of its two neighbouring grid points at random, with the probabilities that keep its expected value exact.** That makes the problem a genuinely finite MDP. Backward induction solves it exactly, every policy can be scored exactly, and the Q-learning agent plays the same MDP the solver solved instead of a cousin of it.

A nice consequence is that the expected value of the next state under random rounding is the linear interpolation of the value function at the unrounded wealth. The solver gets to look like ordinary interpolated DP while being exact for the game the agent plays.

### Three Ways to Choose

Backward induction<sup>[[3]](#ref-3)</sup> starts at the end of year 30, where the value of wealth is known, and works back one year at a time:

$$
V_t(s) = \max_a \Big( r(s, a) + 0.96 \, \mathbb{E}\big[ V_{t+1}(s') \mid s, a \big] \Big).
$$

It needs the transition probabilities, which only exist because I wrote them down.

Q-learning<sup>[[4]](#ref-4)</sup> needs none of that. It runs simulated lives and nudges a table of action values toward what it saw,

$$
Q_t(s, a) \leftarrow Q_t(s, a) + \alpha \Big( r + 0.96 \max_{a'} Q_{t+1}(s', a') - Q_t(s, a) \Big),
$$

which is the setting where RL earns its keep: you can simulate your life but you can't write down its probabilities.

The rules of thumb are policies a person could follow from a spreadsheet. The headline rule spends 80% of what is left after rent (never less than $20K), holds 60% stocks, and buys the offered item whenever savings cover its price. The grid search varies the save rate, the stock share, the spending floor, and how many times the price savings must cover before buying.

## Implementation

### One Cash-Flow Function for Everyone

Every policy, solved, learned or rule, goes through the same function for a year of money. That was the decision that made the comparison trustworthy, since a policy can't win because its environment was slightly kinder.

```python
def cash_flow(self, w, y, o, spend_frac, share, buy):
    p = self.p
    cash = w + self.y_vals[y] - p.rent
    price = self.prices[o]
    can_buy = (buy > 0) & (o > 0) & (cash - price >= p.c_min)
    spendable = cash - np.where(can_buy, price, 0.0)
    c = np.maximum(spend_frac * spendable, np.minimum(p.c_min, spendable))
    shortfall = spendable < p.c_min
    c = np.where(shortfall, p.c_min, c)
    savings = np.where(shortfall, 0.0, spendable - c)
    reward = self.u(c) + np.where(can_buy, self.bonus[o], 0.0)
    return reward, savings, can_buy, shortfall
```

### Backward Induction in Two Seconds

The solver evaluates every state and action of a year in one NumPy broadcast, 1,440 states by 120 actions by 3 market outcomes. Income and offer transitions don't depend on the action, so their expectation is folded into the next year's value before the inner loop, and only the market outcome is averaged per action.

```python
for t in range(T - 1, -1, -1):
    EV = _expected_next(m, V[t + 1])
    Q = reward + p.discount * _continuation(m, EV, savings, share, y_idx)
    act[t] = Q.argmax(axis=-1)
    V[t] = Q.max(axis=-1)
```

All 30 years solve in about 2 seconds. The same backward pass with the action fixed instead of maximized is exact policy evaluation, and that is how every number in this post is scored, rules and learned policies included. The value the solver reports at the starting state matches its own policy's evaluation to the last digit, and 100,000 simulated lives land within two standard errors of it.

### Q-Learning on Batches of Lives

The agent runs 8,192 lives in lockstep, year by year, with ε-greedy exploration falling linearly from 1 to 0.02 over the first 80% of training. The table has 5.2 million entries (30 years by 1,440 states by 120 actions). Two lives often hit the same state and action in the same batch, so each batch averages their targets before updating, with a step size that decays with the visit count.

```python
uniq, inv, cnt = np.unique(flat, return_inverse=True, return_counts=True)
sums = np.bincount(inv, weights=target)
n_new = N.flat[uniq] + cnt
alpha = np.minimum(1.0, cnt / n_new ** lr_power)
old = Q.flat[uniq]
Q.flat[uniq] = old + alpha * (sums / cnt - old)
N.flat[uniq] = n_new
```

Training runs 3,000 batches, 24.6 million simulated lives, in about 16 minutes per seed on one CPU core (26 for the double version below). The greedy policy is scored exactly every 100 batches.

## Problems

### 1. Q-Learning Believed It Was Far Better Than It Was

After 24.6 million lives, plain Q-learning's own table said the starting state was worth a certainty equivalent of $47,467 a year. The true optimum is $35,573, and the policy the table actually implies earns $29,401 when scored exactly. **The agent thought it was 61 percent better than it was, and 33 percent better than perfect.**

This is the maximization bias Thrun and Schwartz described<sup>[[8]](#ref-8)</sup>. Every target takes a max over 120 noisy action values, and the max of noisy estimates is biased upward even when each estimate is unbiased on its own. In a 30-year problem the bias compounds, because each year's target bootstraps from the next year's already inflated max. The estimate was still falling when training ended.

Double Q-learning<sup>[[7]](#ref-7)</sup> is the standard fix. It keeps two tables, picks the next action with one and values it with the other, so the noise in the choice and the noise in the value stop lining up.

```python
a_star = tables[i][nxt].argmax(axis=1)
boot = tables[1 - i][nxt][np.arange(sel.sum()), a_star]
```

It fixed the estimate. **With the same 24.6 million lives, Double Q-learning valued its start at $27,456 and its policy actually earns $26,253, a 5 percent gap instead of 61.** The policy itself got worse, though, falling below plain Q-learning and below the 20% rule. Each table sees only half the samples, and an honest estimate of a mediocre policy is still a mediocre policy. Getting the value right and getting the choices right turned out to be separate problems.

### 2. A Policy That Only Looks at Salary Never Spends Its Savings

The 20% rule ties spending to income. That sounds prudent, and in the first few years it spends about what the optimum spends ($20.8K against $20.9K in year one). Then the two diverge. **The rule's average spending flattens out around $48K, while the optimal plan keeps raising spending every year, to $80K by year 30**, because the optimal plan treats savings as something to eventually consume.

<figure data-figure="chart:projects/personal-finance-rl/personal-finance-rl-spending"></figure>

The rule's median household reaches year 30 with $275K. That is not wasted (it funds retirement in the model), but it is wealth the household could have enjoyed earlier at a lower marginal utility. Raising the save rate, which is what a cautious person would try first, makes this worse.

### 3. "Affordable" Was Defined Backwards

The rule's purchase test is the one most people actually use: buy it if the money is in the account. Under that test the household takes 96% of vacation offers and 73% of car offers, and **23% of simulated lives hit at least one shortfall year, against 13% under the optimal plan.** A $30K car bought the year savings first reach $30K is a buffer that is gone the year a job ends.

The optimal plan's test looks completely different. For a low earner at the start of a career, it buys the vacation only with about $154K saved, roughly 26 times its price, and the car only with about $429K, roughly 14 times its price. A high earner buys any vacation and buys the car at $178K. The thresholds rise with age, because the same savings must stretch further once there are fewer salary years left to refill them. **What the optimum responds to is total resources, salary and remaining career included, relative to the price.** Whether the cash exists today barely enters into it.

## Results

### Every Policy Against the Optimum

<figure data-figure="chart:projects/personal-finance-rl/personal-finance-rl-policies"></figure>

| Policy | Lives with a shortfall | Vacations bought | Cars bought |
| --- | --- | --- | --- |
| Backward induction | 13.3% | 55% | 26% |
| Best rule in the grid | 28.2% | 53% | 15% |
| Save 20%, never buy extras | 12.1% | 0% | 0% |
| Q-learning (seed 0) | 28.3% | 41% | 20% |
| Save 20%, buy when affordable | 22.9% | 96% | 73% |
| Double Q-learning (seed 0) | 30.9% | 38% | 25% |

Path statistics come from 100,000 simulated lives per policy with the same random numbers for every policy.

The best rule in the grid saves 30%, holds 100% stocks, never spends below $30K, and buys an item only when savings are at least 20 times its price. The optimum beats it by 9%, a respectable result for four numbers found by brute force. It still runs short in 28% of lives, because a $30K floor drains $39K a year from savings during unemployment, and its median household retires with $664K it never got to spend.

### Where the Optimal Plan's Advantage Comes From

Taking one choice away from the optimal plan and re-solving shows what each choice is worth.

| Optimal plan, restricted to | Certainty equivalent | Versus unrestricted |
| --- | --- | --- |
| No restriction | $35,573 | |
| 100% stocks always | $35,548 | −0.1% |
| Never buying extras | $35,136 | −1.2% |
| 50% stocks always | $34,353 | −3.4% |
| No stocks | $32,523 | −8.6% |

Two things stand out. **The optimal plan holds essentially all stocks for 25 years and only de-risks in the last five**, falling to 75% by year 30. A salary works like a large bond holding, so a young household with most of its wealth still in future paychecks can carry more market risk than the 76% a static Merton calculation suggests for these returns<sup>[[5]](#ref-5)</sup>. This matches the life-cycle portfolio literature<sup>[[6]](#ref-6)</sup>, and it came out of the solver without being asked for.

The second is the size of the purchase decision. **Well-timed purchases are worth $437 a year of certainty equivalent to the optimal plan. Badly timed ones cost the 20% rule $3,927.** The upside of getting extras right is small because the optimum skips most of them anyway. The downside of getting them wrong is large because each one lands on the household's thinnest margin.

The grid is not quietly driving any of this. Doubling the wealth grid to 240 points moves the optimum by 0.1% and the 20% rule by 0.3%.

### What Q-Learning Learned

<figure data-figure="chart:projects/personal-finance-rl/personal-finance-rl-q-curve"></figure>

**Plain Q-learning reaches $29,401 and $29,173 on two seeds, 82 to 83 percent of the optimum.** That beats the 20% rule by $1,600 to $1,800 a year and falls $3,200 to $3,500 short of the best four-number rule, which took a brute-force sweep and no learning at all. Most of the gain came early. The first 3.3 million lives got it to about $27,000, and the next 21 million added about $2,000. It peaked near $29,600 around 16 million lives, with exploration still at 18 percent, and slipped when exploration bottomed out at 2 percent and the table was read greedily almost everywhere.

The learned policy differs from the optimum in readable ways. It holds roughly half its savings in stocks for the first 20 years where the optimum holds essentially all stocks, and it runs short in 28% of lives against 13%. Stock share is a hard thing to learn from samples. Moving 25 points of savings from bonds to stocks adds about 1.4 percent a year of expected return and 4.8 points of volatility, so any single year says almost nothing about which share was better. Forcing the optimum to 50% stocks costs it only 3.4%, so stocks explain part of the gap and not all of it. The table touched 2.5 million of its 5.2 million entries. The rest are states no simulated life reached, which is harmless right up until a life lands in one.

## What I Would Change

The purchase bonuses are the weakest part of the model. They are set by hand, and the exact thresholds (26 times the price for a vacation) depend on them directly. So I re-solved with both bonuses halved and doubled. The structure survives. Thresholds fall with income and rise with age at every scale, a low earner starting out never buys below 10 times the price, and buying whenever cash covers the price costs the 20% rule $3,124 to $4,497 a year while good purchases are worth $111 to $1,167 to the optimum. The specific multiples move a lot, though, and should not be read as advice.

The rest of the realism the course project asks for is missing on purpose. There is one stock, no taxes, no borrowing, no housing decision, and rent never changes. Each would add a state variable, and the exact solver is what made the comparison clean, so the next version should add them one at a time while it can still be solved exactly.

On the RL side, the next step is to stop treating the 1,440 states of a year as unrelated. Wealth is ordered and the value function is smooth in it, so a function approximator over (year, wealth, salary, offer), or even a coarser grid for the learner alone, would share what one life teaches with its neighbours. The exact solver makes that experiment cheap to grade. Any approximation can be scored against the true optimum, instead of against its own value estimate, which in this project was off by 61 percent.

## References

1. <span id="ref-1"></span>Ashwin Rao. *CME 241: Foundations of Reinforcement Learning with Applications in Finance*. Stanford University, Winter 2026. [link](https://cme241.github.io)
2. <span id="ref-2"></span>Ashwin Rao and Tikhon Jelvis. *Foundations of Reinforcement Learning with Applications in Finance*. Chapman and Hall/CRC, 2022.
3. <span id="ref-3"></span>Richard Bellman. *Dynamic Programming*. Princeton University Press, 1957.
4. <span id="ref-4"></span>Christopher J. C. H. Watkins and Peter Dayan. *Q-learning*. Machine Learning 8, 279 to 292, 1992. [doi:10.1007/BF00992698](https://doi.org/10.1007/BF00992698)
5. <span id="ref-5"></span>Robert C. Merton. *Lifetime Portfolio Selection under Uncertainty: The Continuous-Time Case*. Review of Economics and Statistics 51(3), 247 to 257, 1969. [doi:10.2307/1926560](https://doi.org/10.2307/1926560)
6. <span id="ref-6"></span>João F. Cocco, Francisco J. Gomes and Pascal J. Maenhout. *Consumption and Portfolio Choice over the Life Cycle*. Review of Financial Studies 18(2), 491 to 533, 2005. [doi:10.1093/rfs/hhi017](https://doi.org/10.1093/rfs/hhi017)
7. <span id="ref-7"></span>Hado van Hasselt. *Double Q-learning*. Advances in Neural Information Processing Systems 23, 2010. [link](https://papers.nips.cc/paper/2010/hash/091d584fced301b442654dd8c23b3fc9-Abstract.html)
8. <span id="ref-8"></span>Sebastian Thrun and Anton Schwartz. *Issues in Using Function Approximation for Reinforcement Learning*. Proceedings of the Connectionist Models Summer School, 1993.
