# Columbia Jobs Playwright

Python Playwright script for Columbia's undergraduate research jobs search page.

The intended flow is:

1. The script opens the site in a visible Chromium window.
2. You complete CAS login and Duo 2FA manually.
3. You press Enter in the terminal after the results page is visibly loaded.
4. It opens each `Read more` posting, captures the page text, returns to results, and paginates until there are no more pages.

## Setup

```bash
cd /Users/farhan/Documents/GitHub/automater/columbia_jobs_playwright
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

## Examples

Run with the browser visible so you can log in:

```bash
python main.py
```

If Playwright's bundled browser hangs or fails on macOS, force the installed Chrome app:

```bash
python main.py --browser chrome
```

Record which account/session you used:

```bash
python main.py --browser chrome --account-label "UNI abc123"
```

Skip the terminal confirmation prompt only if the page is loading reliably:

```bash
python main.py --browser chrome --no-manual-confirm
```

Write output to a custom file:

```bash
python main.py --output out/columbia_full_dump.json
```

Run headless after you already know the session flow works:

```bash
python main.py --headless
```

Increase the initial login wait timeout:

```bash
python main.py --timeout-ms 180000
```

## Notes

The script collects job detail links from `Read more` anchors before visiting them, which is more stable than holding stale element handles across back/forward navigation.

If launch fails before any browser window appears, the issue is browser startup rather than Columbia login. On macOS, `--browser chrome` is the first fallback to try.

If a run reports `Found 0 job listings`, inspect the generated files under `debug/` next to the output JSON. They contain the exact HTML and visible text from the page the script saw.
