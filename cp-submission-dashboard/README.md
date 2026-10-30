# Submission Activity

A fast Next.js dashboard for tracking submission activity across Codeforces, AtCoder, LeetCode, CodeChef, CSES, Kattis, and UVa Online Judge.

The heatmap and recent-submission feed read from the bundled `data/submissions.json` file, so page requests do not wait on external services. The refresh workflow updates that dataset before deployment.

## Development

```bash
cp .env.example .env.local   # then fill in your handles
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

`pnpm dev` deletes `node_modules` and `.next`, reinstalls, and starts from a clean build. Use `pnpm dev:fast` to skip that and start the dev server as-is.

## Configuration

Every account-specific value is an environment variable, so the project runs for
any set of accounts. Copy `.env.example` to `.env.local` and fill in what you use;
platforms without a handle are skipped.

| Variable | Purpose |
| --- | --- |
| `CODEFORCES_HANDLE`, `ATCODER_HANDLE`, `LEETCODE_HANDLE`, `CODECHEF_HANDLE` | Public handles fetched by the refresh script |
| `KATTIS_USERNAME`, `UVA_USERNAME` (or `UVA_USER_ID`) | Kattis and UVa accounts |
| `OWNER_NAME`, `OWNER_URL`, `SITE_ICON_URL` | Shown in `/submissions.json` and used as the favicon |
| `LEETCODE_SESSION` | Optional cookie that unlocks full LeetCode history instead of the last 20 |
| `CSES_SESSION` | Cookie required for CSES |
| `KATTIS_COOKIE` | `KattisSiteCookie` value, only if your submission history is private |
| `LEETCODE_API_URL`, `CODECHEF_API_URL` | Optional alternate feed and CodeChef fallback proxy |
| `GITHUB_REFRESH_TOKEN`, `GITHUB_REPO`, `GITHUB_REFRESH_WORKFLOW`, `GITHUB_REFRESH_BRANCH` | Power the **Refresh now** button (see below) |

Never commit cookies or tokens. `.env*` files are git-ignored.

In GitHub Actions the handles are read from repository **variables** and the cookies
from repository **secrets** (Settings → Secrets and variables → Actions). Set the same
handle and identity variables on your Vercel project.

## Refresh data

To update submissions and rebuild all dependent local datasets in one command:

```bash
pnpm refresh:local
```

Refresh options are forwarded to the submission fetcher, so targeted refreshes and
full-history backfills work too:

```bash
pnpm refresh:local -- --only=leetcode
pnpm refresh:local -- --full
```

This updates submissions, Halim solved marks, YouKn0wWho, and AtCoder Topicwise.
The AtCoder category sync is best-effort; if its upstream is unavailable, the command
rebuilds from the last cached category data. CSES keeps its existing quota protection;
set `REFRESH_CSES=true` when you intentionally want to include it.

To fetch submissions without rebuilding the dependent lists, use:

```bash
pnpm refresh
```

Add `--full` to paginate entire histories for a one-time backfill, and `--only` to
refresh a subset of judges:

```bash
pnpm refresh -- --only=codeforces,atcoder
```

Valid keys are `codeforces`, `atcoder`, `leetcode`, `codechef`, `cses`, `kattis`,
and `uva`. The `PLATFORMS` environment variable does the same thing.

To export only Kattis submissions, use the standalone scraper:

```bash
pnpm fetch:kattis -- --full > /tmp/kattis-submissions.json
```

It reads `KATTIS_USERNAME` and `KATTIS_COOKIE` from `.env.local`. To update the
dashboard data directly instead of exporting a file, use
`pnpm fetch:kattis -- --full --merge`.

LeetCode reads the public recent-submissions feed from
[alfa-leetcode-api](https://alfa-leetcode-api.onrender.com) (latest 20 attempts with
verdicts, falling back to LeetCode's own GraphQL), and uses the full authenticated
history instead when a valid `LEETCODE_SESSION` is set. SPOJ entries are maintained
manually in `data/spoj-manual.json` because its public submission page blocks
automated refreshes.

## Build and deploy

```bash
pnpm build
pnpm start
```

The project deploys directly to Vercel. GitHub Actions refreshes and commits the
submission dataset on schedule.

### Workflows

`refresh-data.yml` runs once a day at 07:00 UTC (3 AM US Eastern in summer),
refreshes every judge, and backs the site's **Refresh now** button.

Each judge also has a manual-only workflow (`refresh-codeforces.yml`,
`refresh-atcoder.yml`, `refresh-leetcode.yml`, `refresh-codechef.yml`,
`refresh-cses.yml`, `refresh-kattis.yml`, `refresh-uva.yml`) for targeted re-runs
from the Actions tab or the CLI:

```bash
gh workflow run refresh-leetcode.yml
gh workflow run refresh-cses.yml -f full=true   # full history backfill
```

All of them call the reusable `refresh-platform.yml` and share one concurrency
group, so only one commits at a time and the data files never race. Every workflow
accepts a `full` input for a one-time backfill of the whole history.

## Structure

- `app/Heatmap.tsx` — activity heatmap and platform/mode controls
- `app/RecentFeed.tsx` — recent submissions with platform and verdict filters
- `app/api/heatmap/route.ts` — local heatmap data endpoint
- `app/api/submissions/route.ts` — local recent-submission endpoint
- `app/submissions.json/route.ts` — full AI-friendly submission export at `/submissions.json`
- `app/halim-book/` — starred CP4/CP5 problems (Steven Halim) with solved marks; exports at `/halim-book.json`, `/halim-book.csv`, and `/halim-book.txt`
- `app/youkn0wwho/` — YouKn0wWho's topic list with solved marks; exports at `/youkn0wwho.json`, `/youkn0wwho.csv`, and `/youkn0wwho.txt`
- `app/atcoder-topicwise/` — AtCoder problems by topic from [AtCoder Categories](https://atcoder-categories.github.io) with solved marks; exports at `/atcoder-topicwise.json`, `/atcoder-topicwise.csv`, and `/atcoder-topicwise.txt`
- `scripts/mark-halim-book-solved.mjs` — flags solved Halim book problems from the submission data
- `scripts/build-youkn0wwho.mjs` — builds `data/youkn0wwho.json` from the topic list sources and flags solved problems
- `scripts/sync-atcoder-topicwise.mjs` — pulls the category tree and topic lists from AtCoder Categories into `data/atcoder-topicwise-source.json` (pass a local clone's path to read from it instead)
- `scripts/build-atcoder-topicwise.mjs` — builds `data/atcoder-topicwise.json` from the synced source and flags solved problems
- `lib/config.ts` — handles and identity read from environment variables
- `lib/leetcode.ts` — authenticated/public LeetCode GraphQL client
- `scripts/refresh-data.mjs` — platform data refresh script
- `data/leetcode-problems.csv` — local LeetCode number, canonical title, and URL catalog used by the Halim and YouKn0wWho generators
- `data/submissions.json` — bundled submission history
- `data/halim-book.json`, `data/halim-book.csv` — Halim book problem list
- `data/youkn0wwho-problems.js`, `data/youkn0wwho-topics.js` — topic list sources from [the-ultimate-topic-list](https://github.com/ShahjalalShohag/the-ultimate-topic-list); `data/youkn0wwho.json` is generated from them
- `data/atcoder-topicwise-source.json` — topic lists synced from [atcoder-categories.github.io](https://github.com/atcoder-categories/atcoder-categories.github.io); `data/atcoder-topicwise.json` is generated from it

## Machine-readable exports

The full deduplicated submission history is available at `/submissions.json`. It contains
schema metadata, account handles, summary counts, field definitions, and one normalized
record per submission. The refresh workflow updates the underlying dataset before the
export is served.

The problem lists are exported the same way, each with a `solved` flag per problem:

- `/halim-book.json`, `/halim-book.csv`, and `/halim-book.txt` — starred CP4/CP5 problems
- `/youkn0wwho.json`, `/youkn0wwho.csv`, and `/youkn0wwho.txt` — YouKn0wWho topic list problems; the JSON carries a `topics` map describing each topic's category and order, and the text file is a fixed-width table with every field
- `/atcoder-topicwise.json`, `/atcoder-topicwise.csv`, and `/atcoder-topicwise.txt` (also at `/atcoder.json`, `/atcoder.csv`, `/atcoder.txt`) — AtCoder problems grouped by topic, with AtCoder Problems difficulty estimates; each problem lists every topic it appears under and its most specific one

## Contributing

Issues and pull requests are welcome. To run the dashboard for your own
accounts, set the variables described in [Configuration](#configuration).

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).
You may use, modify, and share it for any noncommercial purpose. Commercial use,
including selling it or offering it as a paid service, is not permitted without
the author's permission.
