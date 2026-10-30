---
layout: post
title: "Tracking Star Growth Across 25,909 GitHub Repos to Find the Ones About to Break Out"
tab_title: Repo Growth
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/github-repo-growth-tracker
date: 2026-02-17 02:24:46
tags:
  - github
  - open-source
  - growth-metrics
description: >-
  A solo Astro and Supabase app that snapshots stars and forks for 25,909
  public GitHub repos every day, rebuilds past star counts by binary-searching
  GitHub's stargazer pages, and ranks repos by growth relative to size.
---

GitHub shows you how many stars a repository has, but not how fast it's getting them, and the speed is the interesting part. I built a tracker that records stars and forks for public repositories every day, reconstructs what their counts were in the past, and ranks them by how quickly they're growing relative to their size. By February 22, 2026 it was tracking 25,909 repos. **The trick that made it useful on day one was rebuilding history, since GitHub's stargazer list is sorted by date and a binary search over its pages finds the star count on any past day in about a dozen requests.**

I built it on my own over four days in February 2026, with an Astro frontend, Supabase Postgres for storage, a Supabase Edge Function as the collector, and a nightly `pg_cron` job to run it. The ranking page was aimed at one reader in particular, someone scouting open-source projects early, before a repo's star count makes the growth obvious to everyone.

## Why It Matters

A repo with 50,000 stars is already known. The ones worth finding are the repos with a few thousand stars whose growth just picked up, and the only way to see that is to compare today's count with last week's and last month's. GitHub's API returns a single current number per repo, so the history has to come from somewhere else. You either collect it yourself, one day at a time, or you rebuild it.

Collecting it is a storage and scheduling problem. Rebuilding it is a search problem. The project needed both, because a tracker that only starts collecting today can't say anything about growth for three months.

## Technical Details

### Daily Snapshots and Deltas

The core table is one row per repo per day, with the star and fork counts. Growth over a window is the latest count minus the count on or before the start of the window. For each repo, the tracker computes four of those differences (1 day, 7 days, 1 month and 3 months) for both stars and forks. They are changes, not totals, and the dashboard sorts on them.

### The Stargazer List Is Sorted by Time

GitHub's stargazers endpoint<sup>[[1]](#ref-1)</sup> returns the people who starred a repo, oldest first, and with the `application/vnd.github.v3.star+json` media type each entry includes a `starred_at` timestamp. That ordering is the whole idea. If page *p* of the list (100 stars per page) starts on a date after your target day, then fewer than 100 × (*p* - 1) stars existed on that day. The first-star date of a page is monotonic in the page number, so finding the page where the dates cross the target is a binary search.

For a repo with up to 40,000 stars that takes about log₂(400) ≈ 9 page requests per target date, plus two to check the first and last pages. Fetching every stargazer instead would take up to 400 requests. GitHub caps the list at 400 pages, so 40,000 stars is as deep as the API lets you look<sup>[[1]](#ref-1)</sup>, and the search works within that window.

### Discovering Repos Without Crawling All of GitHub

There's no list of every repo worth tracking. The collector uses GitHub's `/repositories?since=<id>` endpoint<sup>[[2]](#ref-2)</sup>, which pages through public repos in ID order, and stores the last ID it reached in a one-row `collector_state` table, so each run picks up exactly where the last one stopped. Coverage grows a few pages per run. A separate script pulls repos above 1,000 stars from the Search API, sorted by stars, so the popular repos show up right away instead of waiting for the ID cursor to reach them.

## Implementation

### The Collector

The Edge Function does two jobs per run. It discovers the next pages of public repos, and then it snapshots a batch of tracked repos taken from a queue view that orders repos by when they were last collected, so the stalest ones go first. Each snapshot is an upsert keyed on the repo and the date.

```ts
const { error: upsertError } = await supabase.from('repo_daily_metrics').upsert(
  {
    tracked_repo_id: repo.tracked_repo_id,
    collected_on: collectedOn,
    stars: payload.stargazers_count,
    forks: payload.forks_count,
    ...
  },
  { onConflict: 'tracked_repo_id,collected_on' }
);
```

Keying on `(tracked_repo_id, collected_on)` makes a run safe to repeat. If the collector runs ten times in a day, each repo still has exactly one row for that day, holding the latest count. That matters while the database is filling up, when a shell script fires the function back to back and a Node poller calls it on a timer.

The collector also handles repos that change underneath it. When GitHub reports a repo as gone, the function marks it inactive so it leaves the queue. When a repo has been renamed or transferred, the payload's `full_name` no longer matches the stored owner and name, and the function updates the stored row before writing the snapshot.

### Rebuilding History

The backfill script runs outside Supabase, against the GitHub API, and writes into the same snapshot table. The binary search itself is short.

```js
let lo = 1;
let hi = maxPage;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const midDate = await getPageDate(owner, name, mid);
  if (midDate === null) return null;
  if (midDate <= targetDate) lo = mid + 1;
  else hi = mid;
}
const starCount = (lo - 1) * PER_PAGE;
```

`getPageDate` fetches one page and returns its first `starred_at` date. For repos small enough to fetch completely, the script downloads every stargazer once, sorts the dates and answers all four target days with a second binary search over the sorted list. Every GitHub response updates a pair of counters from the `x-ratelimit-remaining` and `x-ratelimit-reset` headers, and when fewer than 50 requests remain the script sleeps until the reset time. It processes repos in descending star order by default, so the repos people are most likely to look up get their history first.

### Computing Growth Once, Not on Every Page View

The first version of the growth numbers was a SQL view. For each repo it found the latest snapshot and then ran four lateral subqueries, one per window, each looking for the most recent snapshot on or before the window start. A view recomputes all of that on every query, four lateral joins per repo across tens of thousands of repos. **I replaced the view with a plain table that a function rebuilds once after each collection run**, with an index on every column the frontend can sort by.

```sql
left join lateral (
  select m.stars, m.forks from public.repo_daily_metrics m
  where m.tracked_repo_id = r.id
    and m.collected_on <= (l.collected_on - interval '7 days')::date
  order by m.collected_on desc limit 1
) m7 on true
```

The query is the same as before. The difference is that it runs once per collection instead of once per visitor. The frontend build also exports the table to JSON and CSV, so the list pages load one static file instead of querying the database. Only the single-repo page talks to Supabase directly, to draw that repo's daily history.

### Scoring Growth Relative to Size

The "Rising" page ranks repos with a signal I wrote for the scouting use case. It starts from engagement, stars plus three times forks, since a fork is a stronger commitment than a star. Then it multiplies five factors.

```ts
const M_base = (0.75 * E_7 / (E_total + 1)) + (0.25 * E_30 / (E_total + 1));

if (S < 1000) R = 0;
else if (S <= 10000) R = 1.0;
else R = (10000 / S) * (10000 / S);

const H_1 = 1 - (0.4 * E_1 / (E_7 + 1));          // hype penalty
// Q_s rewards a strong last week relative to the month,
// C_90 rewards a strong last month relative to the quarter
return Math.max(0, M_base * R * H_1 * Q_s * C_90 * 10000);
```

`M_base` is growth as a fraction of the repo's current size, weighted toward the last week. `R` is the target zone. Repos under 1,000 stars score zero because tiny repos swing wildly on a handful of stars, repos between 1,000 and 10,000 count fully, and above that the score falls with the square of the size. `H_1` discounts a repo whose week came mostly from a single day, which is what a link going viral looks like. The last two factors compare each window with the next longer one, so a repo that is speeding up gets up to 1.5 times its score and one that is slowing down gets proportionally less.

## Results

In the February 22 export of 25,909 repos, 13,009 were under 1,000 stars, 9,047 were in the 1,000 to 10,000 zone and 3,853 were above it. 730 repos had a signal above zero, and 16 cleared 20, the cutoff the page uses to label a repo "hot".

The top of the list shows what a ratio-based score does. **The four highest scores went to quiet repos between 1,026 and 3,330 stars that gained 7 to 13 stars in the week**, because a small, steady gain on a small base is a large fraction. The fifth was a repo with 49,042 stars that had gained 35,310 of them in the previous month. Its size cuts its score by a factor of about 24, and the growth was large enough to place it fifth anyway. Sorting by raw weekly stars instead puts entirely different repos at the top, all with more than 49,000 stars, the largest at 215,991.

Those two lists answer different questions. Raw stars find what everyone is already looking at. The ratio finds repos where a small amount of attention is a big change, and that's the list a scout wants, as long as they remember that 7 stars is still 7 stars.

## What I Would Change

### A Floor on Absolute Growth

The ratio rewards steady movement on a small base, which is the point, but a repo should probably need some minimum number of new stars in the week before it can top the list. A floor of a few dozen would keep the ranking about breakouts rather than small fractions.

## References

<a id="ref-1"></a>[1] GitHub, "REST API endpoints for starring," docs.github.com/en/rest/activity/starring.

<a id="ref-2"></a>[2] GitHub, "List public repositories," docs.github.com/en/rest/repos/repos#list-public-repositories.
