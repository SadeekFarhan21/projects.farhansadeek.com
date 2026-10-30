# Git auth: OAuth, SSH, and PAT per remote (advanced)

## Implemented in app + bridge today

- **HTTPS PAT** on `git.pull` / `git.push` RPC (plaintext on the WebSocket — use **WSS**).
- **`git.remote_list`** so the client can match **`origin`** (or the first remote) to a PAT in **Settings → Git PAT by remote fetch URL** (normalized host + path). Falls back to per-bridge PAT, then global onboarding token.

## GitHub OAuth (future)

Typical shape for Expo:

1. Register a GitHub OAuth App or GitHub App with callback URL suitable for **Expo AuthSession** / deep link.
2. Exchange code for access token; store **refresh token** (if using GitHub App with refresh) in **Secure Store** scoped by workspace / bridge key.
3. Map tokens per **`workspaceId`** (JWT) or per virtual root — never log token values; rely on server **redaction** for support logs.

OAuth is intentionally **not** wired in the UI yet: it requires product decisions (which GitHub orgs, token scopes, enterprise SSO).

## SSH (future)

- **Threat model:** mounting user SSH keys into a **shared** bridge container is risky; prefer **per-workspace VM** (see [architecture-full-vm-bridge.md](architecture-full-vm-bridge.md)) with ephemeral keys or SSH agent forwarding inside the VM only.
- Server-side: set **`GIT_SSH_COMMAND`** or use **`ssh` wrapper** with an isolated known-hosts file and no `StrictHostKeyChecking=no` in production without pinning.

## References

- Protocol: [remote-workspace-protocol.md](remote-workspace-protocol.md) Phase 5–6.
- Client PAT resolution: [lib/gitRemotePat.ts](../lib/gitRemotePat.ts).
