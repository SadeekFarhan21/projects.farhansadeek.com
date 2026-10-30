# Treena workspace bridge

One WebSocket per client: **PTY**, **FS**, **file watcher**, **agent tools**, **Git RPC**, **workspace search / diagnostics**, **LSP** (`lsp.req` / `lsp.resp` → `typescript-language-server`), paths confined to **`WORKSPACE_DIR`**.

Full protocol: [docs/remote-workspace-protocol.md](../docs/remote-workspace-protocol.md).

## Auth

### `BRIDGE_TOKEN` (shared secret)

Set **`BRIDGE_TOKEN`** to a long random string. Clients must use query param **`token=<same>`**. The app stores it in the keychain and builds the URL via `buildRemoteWorkspaceWsUrl`. Without it, the bridge accepts any connection (**dev/LAN only**).

### `JWT_SECRET` (HS256, optional)

Set **`JWT_SECRET`** or **`BRIDGE_JWT_SECRET`**. Claims must include **`workspaceId`** (string) and **`exp`**. Optional **`JWT_ISS`**, **`JWT_AUD`**. Optional **`WORKSPACE_ID`** env binds the claim `workspaceId` to a fixed tenant.

Client supplies JWT either as **`?jwt=`** on the WebSocket URL or as the first message:

`{ "t": "session.auth", "jwt": "<token>" }` (within **15s**).

When **both** `BRIDGE_TOKEN` and `JWT_SECRET` are set, **both** are required.

### Session frame

After auth, the server sends **`session.ok`** (`workspaceId`, `rootFileUri`) then the PTY connected banner. The app waits for **`session.ok`** before other RPCs. See protocol doc for **`session.err`** codes.

## Rate limits & safety

- Inbound frames capped at **2 MiB**.
- **~80** messages/sec per WebSocket; **~200**/sec per client IP when **`TRUST_PROXY=1`** (uses first **`X-Forwarded-For`** hop).
- Concurrent caps: **`run_command`** (foreground) **3**, **`run_command`** (`background: true`) **3**, **`grep`** **2**, **`workspace.search` + `diagnostics.file`** **2** combined.
- Audit JSON lines on stdout; **`safeLog`** redacts tokens/JWT-shaped strings from error paths.

## Cloud idle (ECS Fargate)

When **`ECS_CLUSTER`** is set, the bridge **auto-destroys** the task after **no WebSocket clients** remain for a grace period (avoids runaway billing).

- **`AUTO_DESTROY_GRACE_MS`** — idle milliseconds before **`StopTask`** after the last WebSocket client disconnects (default **50 minutes**, `50 * 60 * 1000`). Set above the app’s cloud background grace (**45 minutes** in `useCloudSession`) so the ECS task usually outlives brief backgrounding and users can reconnect.

### In-app browser / dev server URLs (Fargate)

The mobile app opens **http(s) links from the terminal** in an in-app WebView. For **cloud / remote workspace**, `http://localhost:PORT` is rewritten to **`http://<task-or-bridge-public-host>:PORT/...`** (same dev port on the workspace machine) so the browser loads assets correctly. The bridge still exposes a legacy **`/__dev/:PORT/`** HTTP path on the bridge port for debugging; the app prefers direct host:port preview.

- **Security group:** allow **inbound TCP** from the internet (or your chosen CIDR) to the ports users run dev servers on (e.g. **3000**, **5173**, **8080**), in addition to the bridge port (**3001**). Without this, the in-app browser will time out when loading those URLs.
  - `server/cloud/deploy-cloud.sh` now opens **3001, 3000, 5173, 8080** on the bridge security group by default. Add any extra app ports you use.
- **iOS App Transport Security:** plain **HTTP** to a **public** task IP may be blocked by ATS (unlike LAN `NSAllowsLocalNetworking`). If previews fail on iOS only, use HTTPS on the task, terminate TLS in front of the task, or add a narrow ATS exception as a last resort.

## Quotas & egress (hosting)

Strong isolation is **not** enforced by Node alone. Example Docker flags:

```bash
docker run --rm \
  --cpus="1.5" \
  --memory=2g \
  --pids-limit=256 \
  -p 3001:3001 \
  -v /path/to/repo:/workspace \
  -e WORKSPACE_DIR=/workspace \
  -e BRIDGE_TOKEN=your-long-random-secret \
  treena-bridge
```

**Egress:** use cloud security groups, iptables in the container network, a sidecar proxy, or a bridge image with no default route — pick one story per environment and document it for operators.

## Run with Node (Linux/macOS/WSL)

```bash
cd server
npm install
npm start
```

Listens on **ws://0.0.0.0:3001**.

## Run with Docker

```bash
cd server
docker build -t treena-bridge .
docker run --rm -p 3001:3001 -v /path/to/repo:/workspace \
  -e WORKSPACE_DIR=/workspace -e BRIDGE_TOKEN=your-long-random-secret treena-bridge
```

The image runs as user **`node`** (non-root). **`typescript-language-server`** is installed under **`/app/node_modules`** for LSP; workspace **`cwd`** remains **`WORKSPACE_DIR`**.

## Point the app at it

1. **Settings** → **Workspace** → enable **Remote workspace**.
2. URL: e.g. `ws://YOUR_LAN_IP:3001` (see protocol doc for emulator notes).
3. Optional: **Bridge token**, **Workspace JWT**, **Git PAT** lines, **PAT by remote URL**.

## Manual QA matrix (release gate)

Run against a **fresh** `docker build` after `npm install` in `server/`. Record **pass/fail** and notes.

| # | Check | Expected |
|---|--------|----------|
| 1 | `BRIDGE_TOKEN` only | Connect with app token; `session.ok`; FS list/read |
| 2 | `BRIDGE_TOKEN` + `JWT_SECRET`; JWT in app | `session.ok`; FS works; wrong JWT → `session.err` / close |
| 3 | FS write, PTY `echo ok`, agent `read_file` + `apply_patch` | Success |
| 4 | `git.status` in a repo; `git.remote_list` returns remotes | OK |
| 5 | `git.pull` / `git.push` with PAT (HTTPS remote) | OK; logs contain **no** PAT (redaction / no raw token in audit) |
| 6 | `@codebase` or **Search** panel `workspace.search` | Capped matches |
| 7 | `diagnostics.file` on a `.ts` file | Diagnostics or empty |
| 8 | **Go to definition** (LSP) on remote TS | Opens target if TLS project resolves |
| 9 | Flood `run_command` or `workspace.search` | `RATE_LIMIT` without killing PTY silently |
| 10 | Optional: IP rate with `TRUST_PROXY=1` | Throttle under abuse |

## Protocol summary

- **Terminal:** `in`, `out`, `resize`, `err`
- **FS:** `fs.*` + `fs.resp`
- **Git:** `git.*` + `git.resp` (includes **`git.remote_list`**)
- **Workspace:** `workspace.search`, `diagnostics.file`, `workspace.embed_search` (stub), `workspace.resp`
- **Agent:** `agent.tool`, `agent.tool_result`
  - `read_file`, `write_file`, `apply_patch`, `list_dir`, `grep`, `run_command` (optional `background`), `start_server`, `browse_url`
- **LSP:** `lsp.req`, `lsp.resp`
- **Session:** `session.ok`, `session.err`, `session.auth`

See [docs/remote-workspace-protocol.md](../docs/remote-workspace-protocol.md).
