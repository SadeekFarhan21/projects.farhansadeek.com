---
layout: post
title: "One Submission Heatmap for Eight Competitive Programming Judges"
tab_title: Submission Heatmap
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/cp-submission-dashboard
date: 2026-06-30 22:48:45
tags:
  - competitive-programming
  - data-pipelines
  - timezones
  - nextjs
description: >-
  A Next.js dashboard that merges 2,506 of my submissions from eight judges into
  one heatmap, where most of the work was turning eight different clocks into
  one timeline and counting a problem as solved only once.
---

My competitive programming history is spread across eight judges, and none of them agree on what time it is. I built a dashboard that pulls every submission I've made on Codeforces, AtCoder, LeetCode, CodeChef, CSES, Kattis, UVa and SPOJ into a single JSON file and draws it as one GitHub-style heatmap. It holds 2,506 submissions from December 2021 to October 2026. **Fetching the data was the easy part. The hard part was that three of the judges print local wall-clock times in three different timezones, and one of them leaves the date off entirely for anything submitted today.**

The second lesson came from the accuracy number. Counting every accepted verdict says I get 58.1% of submissions right. But 575 of those 2,506 submissions came after I had already solved the problem, 401 of them on LeetCode. **Counting only attempts made before the first accept drops accuracy to 52.7%, and that's the honest number.** This is a solo project in Next.js 15, with a GitHub Actions job that refreshes the data every night.

## Why It Matters

If you practice competitive programming seriously you end up on several judges. Codeforces has the contests, AtCoder has the clean problem sets, CSES has the classic 300-problem list, LeetCode has interview prep, and Kattis and UVa have the problems from Steven Halim's book<sup>[[1]](#ref-1)</sup>. Each one keeps its own profile page and its own streak, so nothing shows the whole picture. You can't see whether you practiced this week. You only see whether you practiced on *that site* this week.

I wanted one page that answers three questions. Did I solve something today? How does this month compare to last month? And which problems from the topic lists I'm working through have I already done? That last one matters because lists like YouKn0wWho's topic list<sup>[[2]](#ref-2)</sup> and Halim's starred problems point at problems on many different judges, and checking them by hand means opening a dozen tabs.

## Technical Details

### The Repository Is the Database

The site never talks to a judge while serving a page. A script, `scripts/refresh-data.mjs`, fetches from every judge and merges the results into `data/submissions.json`, which is committed to the repository. The Next.js app imports that file at build time, and the heatmap, the recent-submissions feed and the `/submissions.json` export all read from it.

I tried the other way first. An early version served stored JSON with a five-minute CDN cache and topped it up with live requests to the judges, so a page view could end up waiting on CodeChef. Moving every network call into a scheduled job means page requests never wait on an outside service, and a broken judge only means that judge's data is a night behind.

The schedule runs in GitHub Actions. One workflow runs every judge at 07:00 UTC, and each judge also has its own manual workflow for targeted re-runs. They all share one concurrency group, so only one job commits at a time and two refreshes can't race on the same file. A **Refresh now** button on the site dispatches the same workflow through the GitHub API, with a ten-minute cooldown.

### Eight Judges, Eight Shapes of Data

Every fetcher returns the same record, with platform, epoch seconds, problem, verdict, an accepted flag, language, runtime and memory. Getting there looks different for every judge.

| Judge | Source | Time format |
| --- | --- | --- |
| Codeforces | Official API<sup>[[3]](#ref-3)</sup> | Epoch seconds |
| AtCoder | AtCoder Problems API<sup>[[4]](#ref-4)</sup> | Epoch seconds |
| LeetCode | GraphQL, or a public wrapper<sup>[[5]](#ref-5)</sup> | Epoch seconds |
| UVa | uHunt API<sup>[[6]](#ref-6)</sup> | Epoch seconds |
| CodeChef | HTML fragment from a JSON endpoint | "10:42 PM 06/08/26", India time |
| CSES | Logged-in task pages | "2026-08-04 21:15:03", Helsinki time |
| Kattis | Profile page HTML | Pacific time, and time-only for today |
| SPOJ | Kept by hand in `data/spoj-manual.json` | Epoch seconds |

The verdicts are just as inconsistent. The same outcome shows up as `OK`, `AC`, `ACCEPTED` and `Accepted`, and wrong answers as `WRONG_ANSWER`, `WRONG ANSWER` and `Wrong Answer`. Each fetcher sets its own `ac` boolean from its judge's spelling, and everything downstream uses the boolean, never the string.

### Merging Without Duplicates

The nightly job only fetches recent pages, so most of what it fetches is already in the file. Each submission gets one or more identity keys, and a fetched row is new only if none of its keys have been seen.

```js
function submissionKeys(s) {
  const keys = [`${s.platform}:${s.epoch}`];
  if (s.id) keys.push(`${s.platform}:${s.id}`);
  if (s.platform === "CodeChef" && !s.id) {
    keys.push(`${s.platform}:anonymous:${s.problem}:${s.verdict}:${s.language ?? ""}`);
  }
  return keys;
}
```

The epoch key catches rows from judges with no submission ID. The ID key catches the same submission coming back with a corrected timestamp, and in that case the fresh row replaces the stored one, which is how timestamp fixes propagate into old data. The same keys also tell paginated fetchers when to stop. LeetCode and CodeChef walk backward through history and break on the first page that contains a known submission, unless the job runs with `--full` for a backfill.

## Implementation

### Turning Wall-Clock Time Into Epoch Seconds

CSES prints submission times in Helsinki time and my Kattis profile in Pacific time, as bare strings with no offset. JavaScript has no function that says "parse this as Helsinki time", so the script does it with `Intl.DateTimeFormat`, which can only go the other way (epoch to local time).

```js
function localDateTimeToEpoch(value, timeZone) {
  const naiveEpoch = Date.parse(`${value}Z`);
  let epoch = naiveEpoch;
  for (let i = 0; i < 2; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(epoch));
    const v = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const displayedEpoch = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour % 24, +v.minute, +v.second);
    epoch = naiveEpoch - (displayedEpoch - epoch);
  }
  return epoch / 1000;
}
```

Start by pretending the string is UTC. Format that instant in the target timezone and see how far the displayed clock is from the string you wanted. That gap is the offset, so subtract it and try again. The second pass matters near daylight-saving changes, where the offset at the first guess can differ from the offset at the real instant. The `% 24` handles the fact that `hour12: false` prints midnight as `24` in some runtimes.

### Kattis Leaves Out the Date

For anything submitted today, Kattis shows only a time like `21:04:11`. The script takes the date from the HTTP `Date` header of the response, converted to Pacific time, and glues it onto the time. Using the server's clock instead of the machine's means a GitHub Actions runner in UTC gets the same answer as my laptop in New York.

### Counting a Problem Once

The heatmap has two modes, all submissions and accepted only. In accepted mode a problem counts on the day it was first solved and never again. Accuracy is stricter. It only counts attempts made before the first accept, because once a problem is solved, later submissions aren't attempts to solve it.

```ts
const acceptedProblems = new Set<string>();
const accuracySubmissions = all.filter((s) => {
  const key = `${s.platform}:${s.problem}`;
  if (acceptedProblems.has(key)) return false;
  if (s.ac === true) acceptedProblems.add(key);
  return true;
});
```

This runs over the full history before the selected date range is applied. If it ran on the range alone, a problem solved last year and re-submitted this month would look like a fresh attempt.

### Problem Lists With Solved Marks

Three pages show topic lists with a solved flag on every problem: Halim's starred problems from *Competitive Programming 4* and 5 (1,429 problems), YouKn0wWho's topic list (3,887) and AtCoder Categories<sup>[[7]](#ref-7)</sup> (2,703). Build scripts join each list against the submission file and write JSON, CSV and fixed-width text exports, and the full history is served the same way at `/submissions.json` with a schema and field definitions, so an LLM can read it directly.

## Problems

### 1. CSES Times Were Three Hours Off

The first CSES fetcher parsed a string like `2026-08-04 21:15:03` as UTC. CSES shows Helsinki time, so every CSES submission landed two or three hours late depending on the season, and late-evening solves were drawn on the next day. **A timestamp with no offset is a local time until proven otherwise.** The fix was the `localDateTimeToEpoch` function above.

### 2. Kattis Submissions From the Future

The first Kattis fetcher took the date from the HTTP header in UTC. In the evening, Pacific time is still on one day while UTC has moved to the next, so a time-only submission from that evening got tomorrow's date and landed in the future. The first patch subtracted a day from any time-only value more than five minutes ahead of now. Converting the response date into Pacific time before using it fixed the cause, because then the date and the time come from the same calendar.

### 3. A Regex That Skipped 22 Solved Problems

The CSES problem list marks each task you've attempted with a score icon, and the fetcher used one regex to pair each task link with its icon. Tasks I had never attempted have no icon, so the regex kept matching past the end of that list item and paired the unattempted task with the *next* task's icon. The attempted task was skipped. **Twenty-two solved CSES tasks, including Dice Combinations, were missing from the data with no error.** Splitting the page on `<li class="task">` and matching inside each item fixed it. The same change started recording CSES task IDs, since CSES renames tasks over time and matching the topic lists by title broke when it did.

### 4. CodeChef's Clock Is in India

CodeChef's recent-submissions feed renders times as strings like `10:42 PM 06/08/26` in India Standard Time, no matter where the viewer is, and very recent ones as `5 min ago`. The parser handles both, converting relative times from the current clock and absolute ones through the same offset trick. IST has no daylight saving, which made this the easiest of the three.

## Results

The file currently holds 2,506 submissions across eight judges, from December 6, 2021 to October 13, 2026. **They cover 1,171 distinct problems, of which 1,017 are solved and 154 are attempted but not yet solved.**

| Judge | Submissions | Solved problems | Accuracy before first accept |
| --- | --- | --- | --- |
| LeetCode | 962 | 320 | 57.0% |
| Codeforces | 650 | 297 | 50.9% |
| CodeChef | 373 | 153 | 42.5% |
| CSES | 226 | 102 | 54.3% |
| Kattis | 118 | 51 | 66.2% |
| AtCoder | 113 | 62 | 60.8% |
| UVa | 39 | 19 | 52.8% |
| SPOJ | 25 | 13 | 56.5% |

LeetCode moved the most. Raw, it looks 66.3% accurate, but 401 of its 962 submissions came after the problem was already solved. **With those removed it drops to 57.0%.** Of the 1,017 solved problems, 715 were accepted on the first submission, and 163 more on the second.

## What I Would Change

SPOJ is the one judge I enter by hand, because its submission page blocks automated requests. I'd like a way to export it that doesn't involve me copying rows.

I'd also store raw responses next to the parsed rows. Every timezone bug above meant re-fetching history from the judge to repair it. With the original strings saved, a parser fix could be replayed offline over everything.

## References

<a id="ref-1"></a>1. Steven Halim, Felix Halim and Suhendry Effendy. *Competitive Programming 4*. [cpbook.net](https://cpbook.net)

<a id="ref-2"></a>2. Shahjalal Shohag. The Ultimate Topic List. [github.com/ShahjalalShohag/the-ultimate-topic-list](https://github.com/ShahjalalShohag/the-ultimate-topic-list)

<a id="ref-3"></a>3. Codeforces API, `user.status`. [codeforces.com/apiHelp/methods](https://codeforces.com/apiHelp/methods#user.status)

<a id="ref-4"></a>4. kenkoooo. AtCoder Problems API. [github.com/kenkoooo/AtCoderProblems](https://github.com/kenkoooo/AtCoderProblems/blob/master/doc/api.md)

<a id="ref-5"></a>5. alfa-leetcode-api. [github.com/alfaarghya/alfa-leetcode-api](https://github.com/alfaarghya/alfa-leetcode-api)

<a id="ref-6"></a>6. uHunt API. [uhunt.onlinejudge.org/api](https://uhunt.onlinejudge.org/api)

<a id="ref-7"></a>7. AtCoder Categories. [atcoder-categories.github.io](https://atcoder-categories.github.io)
