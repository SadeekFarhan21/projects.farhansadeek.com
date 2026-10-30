# Full VM bridge (architecture note)

## When to cut over

Move from “single Node process + `WORKSPACE_DIR`” to **per-session or per-workspace VMs** when you need:

- **Multi-tenant** untrusted code execution with stronger isolation than filesystem sandboxing.
- **Compliance** requirements that forbid shared kernels or demand attestable images.
- **SSH / arbitrary binaries** (language servers, native tools) where users supply credentials or untrusted plugins.

## Cutover criteria (checklist)

1. Identity is **verifiable per session** (JWT + `workspaceId` today; extend to tenant IDs).
2. **Rate limits and quotas** are enforced at the orchestration layer (CPU, RAM, disk, PIDs, egress), not only in Node.
3. **Protocol stability:** keep the WebSocket JSON contract (`session.ok`, FS, git, workspace, `lsp.req` / `lsp.resp`) so the mobile app needs at most transport/config changes, not a rewrite.

## Protocol stability

The app should assume:

- Same message types and ordering after TCP connect (optional `BRIDGE_TOKEN`, optional JWT, then `session.ok` + PTY banner).
- FS paths remain posix-relative under the workspace root inside the VM mount.

Orchestration (Fly Machines, Firecracker, etc.) sits **behind** the same bridge entrypoint or proxies WebSockets into the VM.

## Non-goals here

Picking a specific cloud vendor or hypervisor — that depends on your hosting constraints and cost model.
