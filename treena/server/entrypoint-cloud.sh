#!/usr/bin/env bash
set -euo pipefail

# Bridge starts immediately — clone + npm install happen in the bridge itself,
# in the background, after the WebSocket is up. This lets clients connect within
# seconds instead of waiting 30-90s for the clone to finish.
echo "[cloud] Starting bridge server (clone runs in background)..."
exec node /app/server.mjs
