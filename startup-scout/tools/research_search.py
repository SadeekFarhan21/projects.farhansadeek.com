# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.2,<2", "httpx>=0.27"]
# ///
"""research-search: a free, key-less MCP server for startup research.

Wraps official public APIs only: SEC EDGAR full-text search, Hacker News (Algolia),
GitHub, Google News RSS, and Wikipedia. No scraping, no API keys required.

Run: uv run --script tools/research_search.py
Optional env: SEC_USER_AGENT (SEC asks for "Name email"), GITHUB_TOKEN (raises rate limit).
"""

import logging
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
import xml.etree.ElementTree as ET
from datetime import date, timedelta

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("research-search")

UA = os.environ.get("SEC_USER_AGENT", "startup-scout research tool admin@example.com")
TIMEOUT = httpx.Timeout(20.0)


def _get(url: str, params: dict | None = None, headers: dict | None = None) -> httpx.Response:
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    r = httpx.get(url, params=params, headers=h, timeout=TIMEOUT, follow_redirects=True)
    r.raise_for_status()
    return r


def _err(source: str, e: Exception) -> str:
    return f"[{source}] request failed: {type(e).__name__}: {e}"


@mcp.tool()
def sec_filings(query: str, forms: str = "D", days: int = 1095, limit: int = 10) -> str:
    """Search SEC EDGAR full-text for filings mentioning a company or phrase.

    Default form "D" = Form D (private fundraising: actual amount sold, date, investor count).
    Use forms="S-1", "10-K", "8-K" etc. for public companies. Wrap exact names in quotes,
    e.g. query='"Generalist AI"'. Returns filer name, form, date, and a link to the filing.
    """
    start = (date.today() - timedelta(days=days)).isoformat()
    params = {"q": query, "forms": forms, "dateRange": "custom",
              "startdt": start, "enddt": date.today().isoformat()}
    try:
        data = _get("https://efts.sec.gov/LATEST/search-index", params).json()
    except Exception as e:
        return _err("sec", e)
    hits = data.get("hits", {}).get("hits", [])[:limit]
    if not hits:
        return f"No {forms} filings found for {query} since {start}."
    out = []
    for h in hits:
        s = h.get("_source", {})
        adsh = h.get("_id", "").split(":")[0]
        cik = (s.get("ciks") or [""])[0].lstrip("0")
        fname = h.get("_id", "").split(":")[-1]
        url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{adsh.replace('-', '')}/{fname}" if cik and adsh else ""
        out.append(f"- {', '.join(s.get('display_names', []))} | {s.get('form')} | filed {s.get('file_date')} | {url}")
    return f"{len(hits)} result(s) (of {data.get('hits', {}).get('total', {}).get('value', '?')}):\n" + "\n".join(out)


@mcp.tool()
def hacker_news(query: str, days: int = 730, limit: int = 10, comments: bool = False) -> str:
    """Search Hacker News stories (or comments) — launches, Show HN, developer sentiment."""
    since = int(time.time()) - days * 86400
    params = {"query": query, "tags": "comment" if comments else "story",
              "numericFilters": f"created_at_i>{since}", "hitsPerPage": limit}
    try:
        data = _get("https://hn.algolia.com/api/v1/search", params).json()
    except Exception as e:
        return _err("hn", e)
    out = []
    for h in data.get("hits", []):
        title = h.get("title") or (h.get("comment_text") or "")[:200].replace("\n", " ")
        out.append(f"- {title} | {h.get('points', 0)} pts, {h.get('num_comments', 0)} comments | "
                   f"{h.get('created_at', '')[:10]} | https://news.ycombinator.com/item?id={h.get('objectID')}"
                   + (f" | {h['url']}" if h.get("url") else ""))
    return "\n".join(out) or f"No HN results for {query}."


def _gh_headers() -> dict:
    tok = os.environ.get("GITHUB_TOKEN")
    return {"Accept": "application/vnd.github+json", **({"Authorization": f"Bearer {tok}"} if tok else {})}


@mcp.tool()
def github_repo(repo: str) -> str:
    """Stats for a GitHub repo ("owner/name"): stars, forks, open issues, contributors, last push, license."""
    try:
        r = _get(f"https://api.github.com/repos/{repo}", headers=_gh_headers()).json()
        c = _get(f"https://api.github.com/repos/{repo}/contributors",
                 {"per_page": 1, "anon": "true"}, _gh_headers())
        link = c.headers.get("link", "")
        contributors = link.split("page=")[-1].split(">")[0] if 'rel="last"' in link else str(len(c.json()))
    except Exception as e:
        return _err("github", e)
    return (f"{r.get('full_name')}: {r.get('description')}\n"
            f"stars {r.get('stargazers_count')} | forks {r.get('forks_count')} | open issues {r.get('open_issues_count')} | "
            f"contributors ~{contributors}\ncreated {r.get('created_at', '')[:10]} | last push {r.get('pushed_at', '')[:10]} | "
            f"license {(r.get('license') or {}).get('spdx_id')} | {r.get('html_url')}")


@mcp.tool()
def github_search(query: str, limit: int = 10) -> str:
    """Search GitHub repositories (sorted by stars). Use qualifiers for precision — loose keywords match
    spammy keyword-stuffed repos. Good: 'topic:robotics topic:dataset', 'org:skypilot-org',
    '"robot learning" in:name,description stars:>100'."""
    try:
        data = _get("https://api.github.com/search/repositories",
                    {"q": query, "sort": "stars", "per_page": limit}, _gh_headers()).json()
    except Exception as e:
        return _err("github", e)
    out = [f"- {i['full_name']} | ★{i['stargazers_count']} | pushed {i['pushed_at'][:10]} | {(i.get('description') or '')[:140]}"
           for i in data.get("items", [])]
    return "\n".join(out) or f"No repos for {query}."


@mcp.tool()
def news(query: str, days: int = 90, limit: int = 15) -> str:
    """Recent news coverage via Google News RSS (public feed). Quote exact names: '"SkyPilot" funding'."""
    params = {"q": f"{query} when:{days}d", "hl": "en-US", "gl": "US", "ceid": "US:en"}
    try:
        root = ET.fromstring(_get("https://news.google.com/rss/search", params).content)
    except Exception as e:
        return _err("news", e)
    out = []
    for item in root.iter("item"):
        src = item.find("source")
        out.append(f"- {item.findtext('title')} | {src.text if src is not None else ''} | "
                   f"{item.findtext('pubDate', '')[:16]} | {item.findtext('link')}")
        if len(out) >= limit:
            break
    return "\n".join(out) or f"No news for {query} in the last {days} days."


@mcp.tool()
def wikipedia(query: str, limit: int = 3) -> str:
    """Wikipedia background on a company, person, or concept: top matches with summaries."""
    try:
        res = _get("https://en.wikipedia.org/w/api.php",
                   {"action": "query", "list": "search", "srsearch": query, "srlimit": limit, "format": "json"}).json()
        out = []
        for hit in res.get("query", {}).get("search", []):
            title = hit["title"]
            s = _get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{title.replace(' ', '_')}").json()
            out.append(f"## {title}\n{s.get('extract', '')}\n{s.get('content_urls', {}).get('desktop', {}).get('page', '')}")
    except Exception as e:
        return _err("wikipedia", e)
    return "\n\n".join(out) or f"No Wikipedia results for {query}."


@mcp.tool()
def sweep(query: str, days: int = 365, company: bool = True) -> str:
    """One-call wide search: runs news, Hacker News, GitHub, SEC Form D and Wikipedia in parallel
    and returns one sectioned digest. Use it FIRST on any new company or topic to map the terrain,
    then go deep with the individual tools or WebSearch. Set company=False for topics (no SEC lookup).
    """
    jobs = {
        "News": (news, (query,), {"days": days, "limit": 8}),
        "Hacker News": (hacker_news, (query,), {"days": max(days, 730), "limit": 5}),
        "GitHub": (github_search, (f'"{query}" in:name,description',), {"limit": 5}),
        "Wikipedia": (wikipedia, (query,), {"limit": 1}),
    }
    if company:
        q = query if query.startswith('"') else f'"{query}"'
        jobs["SEC Form D"] = (sec_filings, (q,), {"days": 1825, "limit": 5})
    with ThreadPoolExecutor(max_workers=len(jobs)) as pool:
        futures = {name: pool.submit(fn, *a, **kw) for name, (fn, a, kw) in jobs.items()}
        return "\n\n".join(f"### {name}\n{f.result()}" for name, f in futures.items())


def _cli() -> None:
    """CLI: research_search.py <tool> <query> [key=value ...] — e.g. `sweep "Config" days=180`."""
    tools = {f.__name__: f for f in (sweep, sec_filings, hacker_news, github_repo, github_search, news, wikipedia)}
    if len(sys.argv) < 3 or sys.argv[1] not in tools:
        sys.exit(f"usage: research_search.py <{'|'.join(tools)}> <query> [key=value ...]")
    kwargs = {}
    for kv in sys.argv[3:]:
        k, v = kv.split("=", 1)
        kwargs[k] = int(v) if v.isdigit() else {"true": True, "false": False}.get(v.lower(), v)
    print(tools[sys.argv[1]](sys.argv[2], **kwargs))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        logging.disable(logging.INFO)
        _cli()
    else:
        mcp.run()
