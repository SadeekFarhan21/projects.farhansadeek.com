#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

# Auto-load local .env if present.
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Missing SUPABASE_PROJECT_REF. Put it in .env or export it before running." >&2
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "Missing CRON_SECRET. Put it in .env or export it before running." >&2
  exit 1
fi

FUNCTION_NAME="${FUNCTION_NAME:-collect-metrics}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-60}"
MAX_RUNS="${MAX_RUNS:-0}"

if ! [[ "${INTERVAL_SECONDS}" =~ ^[0-9]+$ ]] || (( INTERVAL_SECONDS <= 0 )); then
  echo "INTERVAL_SECONDS must be a positive integer." >&2
  exit 1
fi

if ! [[ "${MAX_RUNS}" =~ ^[0-9]+$ ]]; then
  echo "MAX_RUNS must be a non-negative integer." >&2
  exit 1
fi

ENDPOINT="https://${SUPABASE_PROJECT_REF}.functions.supabase.co/${FUNCTION_NAME}"

run_count=0
success_count=0
failure_count=0

print_summary() {
  echo "----- minute poll summary -----"
  echo "runs=${run_count} success=${success_count} failure=${failure_count}"
}

trap 'print_summary' EXIT

echo "Starting minute collector"
echo "endpoint=${ENDPOINT}"
echo "interval=${INTERVAL_SECONDS}s max_runs=${MAX_RUNS} (0 = infinite)"

while true; do
  run_count=$((run_count + 1))
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "----- run ${run_count} @ ${timestamp} -----"

  set +e
  response="$(curl -sS --max-time 55 -X POST "${ENDPOINT}" \
    -H "x-cron-secret: ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{}')"
  curl_exit=$?
  set -e

  if (( curl_exit != 0 )); then
    echo "curl failed with exit code ${curl_exit}"
    failure_count=$((failure_count + 1))
  else
    echo "${response}"
    if echo "${response}" | rg -q '"ok"\s*:\s*true'; then
      success_count=$((success_count + 1))
    else
      failure_count=$((failure_count + 1))
    fi
  fi

  if (( MAX_RUNS > 0 && run_count >= MAX_RUNS )); then
    break
  fi

  sleep "${INTERVAL_SECONDS}"
done
