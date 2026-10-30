"""A small life-cycle personal finance MDP.

Money is in thousands of dollars per year. Each year the household earns a
salary that moves between four Markov states, pays fixed rent, may be offered
an optional purchase (a vacation or a car), then picks how much to spend, how
much of its savings to hold in stocks, and whether to buy the offered item.

The state is (year t, wealth w, income state y, offer o). Wealth lives on a
fixed grid. After the market moves, next-year wealth is rounded to one of its
two neighbouring grid points at random, with probabilities set so the
expectation is exact. That keeps the MDP finite and discrete, so backward
induction solves it exactly and an RL agent can act in the very same MDP.
"""

from dataclasses import dataclass, field

import numpy as np


@dataclass(frozen=True)
class Params:
    horizon: int = 30                 # working years
    discount: float = 0.96
    gamma: float = 2.0                # CRRA risk aversion
    rent: float = 24.0                # fixed obligation per year
    c_min: float = 5.0                # consumption floor when cash runs out
    retire_years: float = 10.0        # terminal wealth is spread over this many years
    w0: float = 10.0                  # starting savings
    y0: int = 1                       # starting income state (low)

    # Salary states: unemployed, low, mid, high.
    incomes: tuple = (15.0, 50.0, 80.0, 120.0)
    income_P: tuple = (
        (0.40, 0.40, 0.20, 0.00),
        (0.05, 0.75, 0.18, 0.02),
        (0.04, 0.08, 0.75, 0.13),
        (0.03, 0.02, 0.10, 0.85),
    )

    # Optional purchases: none, vacation, car. Each comes with a one-off
    # utility bonus worth `equiv` thousand of ordinary consumption at a
    # 50k-a-year lifestyle, and costs `price`.
    offer_probs: tuple = (0.50, 0.35, 0.15)
    prices: tuple = (0.0, 6.0, 30.0)
    equiv: tuple = (0.0, 12.0, 45.0)
    c_ref: float = 50.0

    # Assets: risk-free bond and a three-outcome stock.
    r_free: float = 0.02
    stock_returns: tuple = (-0.25, 0.07, 0.30)
    stock_probs: tuple = (0.20, 0.50, 0.30)

    # Grids.
    n_wealth: int = 120
    w_max: float = 3000.0
    spend_fracs: tuple = tuple(np.round(np.linspace(0.05, 1.0, 12), 4))
    stock_shares: tuple = (0.0, 0.25, 0.5, 0.75, 1.0)


@dataclass
class Model:
    p: Params = field(default_factory=Params)

    def __post_init__(self):
        p = self.p
        # Quadratic spacing: fine near zero where the floor and rent bite.
        x = np.linspace(0.0, 1.0, p.n_wealth)
        self.w_grid = p.w_max * x ** 2
        self.y_vals = np.array(p.incomes)
        self.P_y = np.array(p.income_P)
        self.p_o = np.array(p.offer_probs)
        self.prices = np.array(p.prices)
        self.bonus = np.array([self.u(p.c_ref + e) - self.u(p.c_ref) for e in p.equiv])
        self.R = np.array(p.stock_returns)
        self.p_R = np.array(p.stock_probs)
        self.fracs = np.array(p.spend_fracs)
        self.shares = np.array(p.stock_shares)
        # Action index a = ((f * n_share) + s) * 2 + buy.
        self.n_actions = len(self.fracs) * len(self.shares) * 2
        a = np.arange(self.n_actions)
        self.a_buy = a % 2
        self.a_share = (a // 2) % len(self.shares)
        self.a_frac = a // (2 * len(self.shares))
        # Denominator of the certainty equivalent: years of utility, discounted.
        T = p.horizon
        self.ce_years = sum(p.discount ** t for t in range(T)) + p.discount ** T * p.retire_years

    # ---- utility -------------------------------------------------------
    def u(self, c):
        g = self.p.gamma
        c = np.maximum(c, 1e-9)
        if g == 1.0:
            return np.log(c)
        return c ** (1.0 - g) / (1.0 - g)

    def terminal(self, w):
        A = self.p.retire_years
        return A * self.u(np.maximum(w, self.p.c_min * A) / A)

    def certainty_equivalent(self, value):
        """Constant yearly consumption (in $k) with the same expected utility."""
        g = self.p.gamma
        per_year = value / self.ce_years
        if g == 1.0:
            return float(np.exp(per_year))
        return float(((1.0 - g) * per_year) ** (1.0 / (1.0 - g)))

    # ---- one year of cash flow ------------------------------------------
    def cash_flow(self, w, y, o, spend_frac, share, buy):
        """Shared by DP, RL and the baselines, so every policy plays the same game.

        All arguments broadcast. Returns (reward, savings, share, shortfall).
        """
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

    def next_wealth(self, savings, share):
        """Wealth after each stock outcome, shape (..., n_outcomes)."""
        gross = 1.0 + self.p.r_free + share[..., None] * (self.R - self.p.r_free)
        return savings[..., None] * gross

    # ---- grid rounding ---------------------------------------------------
    def bracket(self, w):
        """Lower grid index and weight on the upper neighbour."""
        w = np.clip(w, 0.0, self.w_grid[-1])
        hi = np.clip(np.searchsorted(self.w_grid, w, side="right"), 1, len(self.w_grid) - 1)
        lo = hi - 1
        span = self.w_grid[hi] - self.w_grid[lo]
        wt = (w - self.w_grid[lo]) / span
        return lo, np.clip(wt, 0.0, 1.0)

    def interp(self, V, w):
        """E[V(rounded w)] equals linear interpolation of V at w."""
        lo, wt = self.bracket(w)
        return (1.0 - wt) * V[lo] + wt * V[lo + 1]

    def round_random(self, w, rng):
        lo, wt = self.bracket(w)
        return lo + (rng.random(np.shape(w)) < wt)
