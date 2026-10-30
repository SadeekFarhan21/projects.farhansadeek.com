# Semantic / embedding search (future)

## Today

- **Text search:** `workspace.search` and the agent **`grep`** tool (ripgrep / grep), capped and path-sandboxed.
- **Placeholder RPC:** `workspace.embed_search` returns **`NOT_IMPLEMENTED`** on the bridge so the protocol reserves a name without implying shipped functionality.

## Possible pipeline (after JWT + rate limits)

1. **Chunk** source files (respect `.gitignore`), bounded file size.
2. **Embed** with a local model in the container or a controlled API (cost + data handling review).
3. **Store** vectors per `workspaceId` (ephemeral per session or persisted with retention policy).
4. **Query** RPC: top-k chunks + citations (path + line range).

This is a **large** dependency and cost surface; ship text search + LSP first.
