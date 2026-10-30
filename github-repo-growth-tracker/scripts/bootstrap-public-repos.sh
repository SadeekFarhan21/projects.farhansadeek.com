#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Missing SUPABASE_PROJECT_REF (example: ylpgpytiofhpfmolebos)" >&2
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "Missing CRON_SECRET" >&2
  exit 1
fi

RUNS="${RUNS:-100}"
SLEEP_SECONDS="${SLEEP_SECONDS:-1}"
FUNCTION_NAME="${FUNCTION_NAME:-collect-metrics}"

ENDPOINT="https://${SUPABASE_PROJECT_REF}.functions.supabase.co/${FUNCTION_NAME}"

echo "Starting bootstrap"
echo "endpoint=${ENDPOINT}"
echo "runs=${RUNS} sleep=${SLEEP_SECONDS}s"

success_count=0
failure_count=0

for ((i=1; i<=RUNS; i++)); do
  echo "----- run ${i}/${RUNS} -----"

  response="$(curl -sS -X POST "${ENDPOINT}" \
    -H "x-cron-secret: ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{}')"

  echo "${response}"

  if echo "${response}" | rg -q '"ok"\s*:\s*true'; then
    success_count=$((success_count + 1))
  else
    failure_count=$((failure_count + 1))
  fi

  if [[ "${SLEEP_SECONDS}" != "0" ]]; then
    sleep "${SLEEP_SECONDS}"
  fi

done

echo "----- done -----"
echo "success=${success_count} failures=${failure_count}"
