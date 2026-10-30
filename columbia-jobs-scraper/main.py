#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin


def prompt_user(message: str) -> None:
    """Prompt the user without depending on stdin. Reads from /dev/tty when stdin
    is unavailable (e.g. when launched from harnesses that don't pipe a real stdin).
    Falls back to a sentinel-file wait if no TTY is attached."""
    sys.stdout.write(message)
    sys.stdout.flush()

    if sys.stdin and sys.stdin.isatty():
        try:
            sys.stdin.readline()
            return
        except EOFError:
            pass

    try:
        with open("/dev/tty", "r") as tty:
            tty.readline()
            return
    except OSError:
        pass

    sentinel = Path.cwd() / ".continue"
    print(
        f"\n[no TTY available] To continue, create the sentinel file: `touch {sentinel}`",
        flush=True,
    )
    while not sentinel.exists():
        time.sleep(0.5)
    try:
        sentinel.unlink()
    except OSError:
        pass

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import Page, sync_playwright


SEARCH_URL = "https://undergrad.research.columbia.edu/jobs/search"
DEFAULT_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def wait_for_search_page(page: Page, timeout_ms: int) -> None:
    checks = [
        lambda: page.wait_for_selector("a:has-text('Read more')", timeout=timeout_ms),
        lambda: page.wait_for_selector("text=/Read\\s+more/i", timeout=timeout_ms),
        lambda: page.wait_for_selector("text=/Project Description/i", timeout=timeout_ms),
    ]

    last_error: Exception | None = None
    for check in checks:
        try:
            check()
            return
        except Exception as exc:
            last_error = exc

    raise RuntimeError("Search page did not become ready after login.") from last_error


def settle(page: Page, timeout_ms: int = 3_000) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except PlaywrightTimeoutError:
        pass


def collect_job_links(page: Page) -> list[str]:
    hrefs = page.locator("a").evaluate_all(
        """
        (anchors) => anchors
          .map((anchor) => ({
            href: anchor.getAttribute("href"),
            text: (anchor.textContent || "").replace(/\\s+/g, " ").trim()
          }))
          .filter((item) => item.href && /read\\s+more/i.test(item.text))
          .map((item) => item.href)
        """
    )

    unique_links: list[str] = []
    seen = set()
    for href in hrefs:
        absolute_href = urljoin(page.url, href)
        if absolute_href not in seen:
            seen.add(absolute_href)
            unique_links.append(absolute_href)
    return unique_links


def write_debug_snapshot(page: Page, output_path: Path, suffix: str) -> None:
    debug_dir = output_path.parent / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)

    slug = re.sub(r"[^a-z0-9]+", "-", suffix.lower()).strip("-") or "snapshot"
    html_path = debug_dir / f"{slug}.html"
    text_path = debug_dir / f"{slug}.txt"

    html_path.write_text(page.content(), encoding="utf-8")
    text_path.write_text(page.locator("body").inner_text(), encoding="utf-8")
    print(f"Saved debug snapshot: {html_path}")
    print(f"Saved debug text: {text_path}")


def extract_job_details(page: Page) -> dict[str, Any]:
    try:
        page.wait_for_selector("text=Project Description", timeout=4_000)
    except PlaywrightTimeoutError:
        pass

    title = ""
    for selector in ["h1", "h2", "main h3", "article h1", "article h2"]:
        locator = page.locator(selector)
        if locator.count() > 0:
            candidate = locator.first.inner_text().strip()
            if candidate:
                title = candidate
                break

    return {
        "url": page.url,
        "title": title,
        "raw_data": page.locator("body").inner_text(),
        "timestamp": time.time(),
    }


def report_parse(job_data: dict[str, Any], index: int, total: int, page_number: int) -> None:
    raw = job_data.get("raw_data", "") or ""
    preview = re.sub(r"\s+", " ", raw).strip()[:240]
    print("\n" + "=" * 72)
    print(f"PARSED job {index}/{total} on search page {page_number}")
    print(f"  url       : {job_data.get('url', '')}")
    print(f"  title     : {job_data.get('title', '') or '(no title found)'}")
    print(f"  chars     : {len(raw)}")
    print(f"  preview   : {preview}{'...' if len(raw) > 240 else ''}")
    print("=" * 72, flush=True)


def write_dump(
    output_path: Path,
    account_label: str,
    jobs: list[dict[str, Any]],
    status: str,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "account_label": account_label,
        "source": SEARCH_URL,
        "status": status,
        "last_updated": time.time(),
        "job_count": len(jobs),
        "jobs": jobs,
    }
    tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)
    tmp_path.replace(output_path)


def go_to_next_results_page(page: Page) -> bool:
    candidates = [
        page.locator('a[rel="next"]'),
        page.get_by_role("link", name="Next"),
        page.get_by_role("link", name="›"),
        page.locator("text=›"),
    ]

    for locator in candidates:
        if locator.count() == 0:
            continue
        try:
            if locator.first.is_visible() and locator.first.is_enabled():
                current_url = page.url
                locator.first.click()
                page.wait_for_load_state("domcontentloaded")
                settle(page)
                if page.url != current_url:
                    return True
        except Exception:
            continue

    return False


def launch_browser(playwright, headed: bool, browser_target: str):
    headless = not headed
    print(f"Launching browser target: {browser_target} ({'headless' if headless else 'headed'})")

    if browser_target == "chromium":
        return playwright.chromium.launch(headless=headless)

    if browser_target == "chrome":
        return playwright.chromium.launch(
            channel="chrome",
            headless=headless,
        )

    if browser_target == "chrome-path":
        chrome_path = Path(DEFAULT_CHROME_PATH)
        if not chrome_path.exists():
            raise RuntimeError(f"Chrome executable not found at {chrome_path}")
        return playwright.chromium.launch(
            executable_path=str(chrome_path),
            headless=headless,
        )

    raise ValueError(f"Unsupported browser target: {browser_target}")


def run_automated_agent(
    output_path: Path,
    headed: bool,
    timeout_ms: int,
    browser_target: str,
    account_label: str,
    manual_confirm: bool,
    pause_after_each: bool,
) -> None:
    with sync_playwright() as playwright:
        try:
            browser = launch_browser(playwright, headed=headed, browser_target=browser_target)
        except PlaywrightError as exc:
            raise RuntimeError(
                "Browser launch failed. Try `--browser chrome` to use the installed Google Chrome app."
            ) from exc
        context = browser.new_context()
        page = context.new_page()

        print(f"Account label: {account_label}")
        print("Please log in and complete CAS + Duo 2FA in the browser window...")
        page.goto(SEARCH_URL, wait_until="domcontentloaded")

        if manual_confirm:
            prompt_user("Press Enter here after the results page is visibly loaded in the browser... ")

        wait_for_search_page(page, timeout_ms=timeout_ms)
        print("Login verified. Starting the scraping loop...")

        all_scraped_jobs: list[dict[str, Any]] = []
        page_number = 1

        while True:
            print(f"\n--- Processing Search Page {page_number} ---")
            settle(page)

            current_search_url = page.url
            job_links = collect_job_links(page)
            total_jobs_on_page = len(job_links)
            print(f"Found {total_jobs_on_page} job listings on this page.")

            if total_jobs_on_page == 0:
                write_debug_snapshot(page, output_path, f"page-{page_number}-no-results")

            for index, job_url in enumerate(job_links, start=1):
                print(f"Opening job {index}/{total_jobs_on_page}: {job_url}")
                try:
                    page.goto(job_url, wait_until="domcontentloaded")
                    job_data = extract_job_details(page)
                    job_data["account_label"] = account_label
                    job_data["search_page"] = page_number
                    job_data["index_on_page"] = index
                    all_scraped_jobs.append(job_data)
                    report_parse(job_data, index, total_jobs_on_page, page_number)
                    write_dump(output_path, account_label, all_scraped_jobs, status="in_progress")
                    print(f"--> Wrote running dump to {output_path} ({len(all_scraped_jobs)} jobs so far).")
                    if pause_after_each:
                        prompt_user("Press Enter to continue to the next job (Ctrl+C to stop)... ")
                except Exception as exc:
                    print(f"Skipping {job_url} due to error: {exc}")

            print(f"Finished page {page_number}.")

            try:
                page.goto(current_search_url, wait_until="domcontentloaded")
                wait_for_search_page(page, timeout_ms=timeout_ms)
            except Exception as exc:
                print(f"Could not return to search results: {exc}")
                break

            if go_to_next_results_page(page):
                page_number += 1
                continue

            print("No more pages found. Scraping complete.")
            break

        write_dump(output_path, account_label, all_scraped_jobs, status="complete")
        print(f"\nDone. Extracted {len(all_scraped_jobs)} jobs into {output_path}")
        browser.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Navigate and scrape Columbia undergraduate research jobs with Playwright."
    )
    parser.add_argument(
        "--output",
        default="columbia_full_dump.json",
        help="Path to the JSON output file.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run headless instead of showing the browser window.",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=120_000,
        help="Timeout for the initial login/search page readiness check.",
    )
    parser.add_argument(
        "--browser",
        choices=["chromium", "chrome", "chrome-path"],
        default="chrome",
        help="Browser target to launch. `chrome` uses your installed Google Chrome via Playwright channel.",
    )
    parser.add_argument(
        "--account-label",
        default="unspecified",
        help="Label for the Columbia account/session being used, stored in the output JSON.",
    )
    parser.add_argument(
        "--no-manual-confirm",
        action="store_true",
        help="Skip the terminal Enter prompt after login and rely only on automatic readiness checks.",
    )
    parser.add_argument(
        "--pause-after-each",
        action="store_true",
        help="After each parsed job, print details and wait for Enter so you can review/guide before continuing.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_automated_agent(
        output_path=Path(args.output).expanduser(),
        headed=not args.headless,
        timeout_ms=args.timeout_ms,
        browser_target=args.browser,
        account_label=args.account_label,
        manual_confirm=not args.no_manual_confirm,
        pause_after_each=args.pause_after_each,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
