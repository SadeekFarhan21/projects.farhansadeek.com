# Treena

Mobile-first AI IDE built with React Native / Expo. Gives developers a full coding environment — file browser, code editor, terminal, in-app browser, and agentic AI — from a phone or tablet, no computer required. Supports local on-device projects and cloud-hosted workspaces (AWS ECS Fargate).

## Tech Stack

- **Expo 54** / **React Native 0.81** / **TypeScript 5.9**
- **Zustand 5** — single store with slices at `store/index.ts`
- **expo-router 6** — file-based routing (`app/` directory)
- **lowlight** — syntax highlighting (VS Code dark theme)
- **isomorphic-git** + `expo-file-system` — on-device Git operations
- **OpenRouter** — LLM access (streaming SSE + tool-use)
- **react-native-reanimated** v4 + **react-native-gesture-handler** v2 — animations and gestures
- **@xterm/xterm** v6 + **@xterm/addon-fit** — terminal emulation (bundled into WebView)
- **react-native-webview** — hosts xterm.js terminal + in-app browser
- **diff** — line-by-line diff computation
- **expo-secure-store** — encrypted storage for API keys / tokens
- **expo-clipboard** — clipboard access (never use `@react-native-clipboard`)
- **expo-haptics** — haptic feedback
- **expo-auth-session** — GitHub OAuth PKCE flow

## Directory Structure

```
app/              _layout.tsx, index.tsx (main IDE), login.tsx, onboarding.tsx, projects.tsx
assets/           images/ (icons, provider logos), terminal/ (xterm bundle)
components/       UI components (see below)
constants/        theme.ts, languages.ts, models.ts
docs/             Architecture & protocol docs
hooks/            useAgent.ts, useCloudSession.ts, useFileSystem.ts, useGit.ts, useRemote*.ts, useDebouncedValue.ts
lib/              LLM, git, diff, terminal, editor, workspace, cloud, auth utilities (see below)
scripts/          bundle-xterm-html.mjs (post-install bundler)
server/           Node.js WebSocket bridge server + cloud infrastructure (see below)
store/            index.ts (all Zustand slices)
types/            html-asset.d.ts (TypeScript declaration for xterm bundle)
```

## App Routes

| File | Purpose |
|------|---------|
| `_layout.tsx` | Root layout: font loading, StatusBar, GestureHandlerRootView, Stack navigator |
| `index.tsx` | Main IDE screen: code editor, terminal, agent chat, file tree |
| `login.tsx` | GitHub OAuth login |
| `onboarding.tsx` | First-run onboarding flow |
| `projects.tsx` | Project list / selection with cloud session management |

## Components

| File | Purpose |
|------|---------|
| `Header.tsx` | Top bar: file name, terminal toggle, model picker, file tree toggle, cloud session controls |
| `CodeViewer.tsx` | Code editor: syntax highlighting, line numbers, TextInput overlay, auto-indent, LSP diagnostics |
| `SyntaxHighlighter.tsx` | lowlight AST → per-line rows with gutter (line numbers + colored code) |
| `FileExplorer.tsx` | File tree with git status badges, inline rename/create, context menu, recursive expand/collapse |
| `AgentBar.tsx` | Chat panel: messages, diff cards, code cards, tool rows, drag-to-resize |
| `FloatingInputPill.tsx` | Floating input at bottom: send/stop, keyboard-aware, haptics, context token gauge, mode selector |
| `AgentStatus.tsx` | "Thinking (step N)…" status indicator shown while agent is running |
| `RemoteXtermTerminal.tsx` | xterm.js in WebView with RNGH pan gesture scroll, base64 I/O, resize, OAuth link detection |
| `TerminalBar.tsx` | Terminal tabs, local/remote mode, WebSocket bridge settings entry point |
| `TerminalToolbar.tsx` | Virtual keyboard for terminal: Tab, Esc, Ctrl, arrow keys, special characters |
| `ModelPicker.tsx` | Modal to pick LLM model with provider logos and context window info |
| `DiffCard.tsx` | VS Code-style diff card (accept/reject) shown inside agent messages |
| `CodeCard.tsx` | Code block card with copy button shown inside agent messages |
| `EditorTabBar.tsx` | Multi-tab bar for open files and browser tabs with close buttons |
| `BrowserView.tsx` | In-app browser tab using WebView (dev server URL rewriting for cloud sessions) |
| `SettingsModal.tsx` | Settings sheet: GitHub token, workspace URL/JWT/tokens, font sizes, sign out |
| `WorkspaceSearchModal.tsx` | Remote codebase grep modal |

## Hooks

| File | Purpose |
|------|---------|
| `useAgent.ts` | Two-mode agent: local streaming chat OR remote tool-loop (up to 200 rounds). Redacts tokens from display. |
| `useCloudSession.ts` | Cloud session lifecycle: provision, poll, auto-save branch on end, destroy |
| `useFileSystem.ts` | File tree sync, create/rename/delete, local vs remote switching |
| `useGit.ts` | Clone, pull, push, commit, status, log — delegates to bridge in remote mode |
| `useRemoteWorkspaceConnection.ts` | WebSocket connection lifecycle |
| `useRemoteFsEvents.ts` | File change event subscriptions from bridge |
| `useRemoteFileDiagnostics.ts` | LSP diagnostic fetch/cache |
| `useRemoteGoToDefinition.ts` | LSP go-to-definition via bridge |
| `useDebouncedValue.ts` | Debounce hook (used for autosave) |

## lib/ Utilities

**LLM**
- `openrouter.ts` — streaming chat via SSE (async generator)
- `openrouterTools.ts` — tool definitions for remote agent (read_file, apply_patch, write_file, list_dir, grep, run_command, start_server, browse_url)
- `sse-parser.ts` — SSE stream parser

**Git (on-device)**
- `git.ts` — isomorphic-git wrapper (clone depth-50, auth via GitHub token)
- `fs-adapter.ts` — expo-file-system as fs.promises for isomorphic-git
- `gitStatusMapper.ts` — isomorphic-git status matrix → GitFileStatus enum
- `gitPorcelain.ts` — parses `git status --porcelain` output from remote bridge
- `gitRemotePat.ts` — per-remote PAT management
- `gitFetchUrlKey.ts` — normalizes git remote URLs for PAT lookup

**Auth / Cloud**
- `githubOAuth.ts` — GitHub OAuth PKCE flow (authorization code grant)
- `cloudSession.ts` — cloud session API client: create, poll, destroy sessions; fetch GitHub repos
- `cloudSessionGitSave.ts` — auto-save workspace to `treena/<date>-<session>` branch on session end
- `signOut.ts` — clears auth secrets from secure storage and navigates to login

**Code / Editor**
- `diff.ts` — `computeLineDiff` (editor gutter marks) + `buildAgentDiff` (agent diff cards)
- `messageParser.ts` — parses markdown code blocks from agent messages, detects diffs
- `editor/autoIndent.ts` — newline auto-indent logic
- `editorTabLabel.ts` — formats file paths as short tab labels
- `codebaseSearch.ts` — formats grep results for agent context
- `fileIcons.ts` — file extension → icon mapping

**Terminal**
- `terminal.ts` — simulated on-device shell (ls, cat, pwd, clear, git stubs)
- `terminalColors.ts` — ANSI color palette
- `terminalBrowseUrl.ts` — rewrites localhost URLs to remote workspace host for in-app browser
- `terminalOAuth.ts` — OAuth link detection in terminal output

**Workspace / Remote Bridge** (`lib/workspace/`)
- `remoteWsBridge.ts` — WebSocket RPC client (~1000 lines): connection state machine, fs ops, git ops, agent tool forwarding, terminal I/O, LSP, file watchers, session JWT, per-bridge PATs
- `remotePaths.ts` — remote path helpers and tree parsing
- `bridgeIdentity.ts` — stable auth key derived from bridge WS URL
- `localTransport.ts` — local device transport stub
- `remoteTransportStub.ts` — remote transport stub
- `types.ts` — WorkspaceMode, WorkspaceTransport types
- `index.ts` — public exports

## Store Slices (`store/index.ts`)

| Slice | Key state |
|-------|-----------|
| UISlice | fileTreeOpen, terminalPanelOpen, terminalExpanded, modelPickerOpen, isAgentChatOpen, isEditingCode, agentMode, activeTabType |
| FileSlice | currentFilePath, currentFileName, currentFileContent, openTabPaths, fileTree, projectRoot, editBuffer, expandedFolders |
| AgentSlice | messages, isGenerating, agentStatus, selectedModel, apiKey, githubToken, agentStepCount, contextTokensUsed |
| GitSlice | currentBranch, gitStatus, repoName, gitFileStatuses |
| TerminalSlice | terminalTabs, activeTerminalId, terminalOutputs (per-tab) |
| PreferencesSlice | codeFontSize, terminalFontSize, settingsOpen, autoSaveBranchOnSessionEnd |
| WorkspaceSlice | remoteWorkspaceEnabled, remoteWorkspaceWsUrl, workspaceBridgeToken, workspaceSessionJwt, remoteGithubPatByFetchUrl, remoteGithubPatByKey |
| DiffSlice | currentDiff (line marks for editor gutter) |
| RemoteDiagnosticsSlice | remoteDiagnosticsByPath |
| OnboardingSlice | hasCompletedOnboarding |
| CloudSessionSlice | cloudSessionId, cloudSessionStatus, cloudSessionError, cloudSessionRepoUrl, cloudSessionBridgeToken, cloudSessionWsUrl, cloudSessionPublicIp, cloudApiBaseUrl |
| BrowserSlice | browserTabs, activeBrowserTabId |

## Server / Remote Workspace Bridge

The bridge is a Node.js WebSocket server (`server/server.mjs`) that runs on the user's computer or a cloud VM. The app connects to it for real filesystem, git, terminal, and agent tool execution.

**Connection:** Settings → Remote workspace → paste `ws://host:port` + optional bridge token/JWT. In cloud mode, the connection is auto-configured on session provision.

**Capabilities:**
- PTY (pseudo-terminal) with resize support
- Full filesystem RPC: list, read, write, mkdir, rm, rename
- File watcher: pushes `fs.event` for add/change/unlink
- Git RPC: status, log, commit, checkout, pull, push, remote_list
- Agent tool forwarding: read_file, write_file, apply_patch, list_dir, grep, run_command, start_server, browse_url
- LSP via typescript-language-server
- Workspace search (grep with rg/grep fallback)

**Auth:** Optional `BRIDGE_TOKEN` (shared secret) + optional `JWT_SECRET` (HS256)

**Rate limiting:** ~80 msg/sec per socket, ~200/sec per IP

**Git auth:** The agent receives the stored GitHub token as a system message and is instructed to use `https://<token>@github.com/<owner>/<repo>.git` for authenticated operations. Tokens are redacted from the chat display.

## Cloud Deployment

Cloud workspaces run on AWS ECS Fargate (`server/cloud/`).

- `api.mjs` — REST API: create, list, destroy cloud sessions
- `auth.mjs` — OAuth token exchange for GitHub
- `db.mjs` — session persistence
- `ecs.mjs` — ECS task launch/management
- `reaper.mjs` — task cleanup
- `sessions.mjs` — session tracking
- `auto-destroy.mjs` — runs inside bridge container, monitors WebSocket clients, auto-stops ECS task after idle grace period (default 50 min, configurable `AUTO_DESTROY_GRACE_MS`)
- `deploy-cloud.sh` — automated deployment (AWS profile, VPC, security groups, ECR, task definition)
- `infra/setup.md` — AWS setup guide

## Agent System

**Local mode** (`remoteWorkspaceEnabled = false`): plain streaming chat, includes current open file as context.

**Remote mode** (`remoteWorkspaceEnabled = true`): multi-round tool loop. The agent calls tools, sees results, and iterates up to 200 rounds before returning a final answer.

**Agent modes:** `plan` (thinks through approach first) and `agent` (acts directly).

`@codebase <pattern>` in a message triggers a remote grep and injects results into the prompt.

## Terminal

xterm.js is bundled into a single HTML file at build time (`scripts/bundle-xterm-html.mjs`) — no CDN. It runs inside a React Native WebView with:
- RNGH `Gesture.Pan()` for touch scroll (bypasses WebView touch interception)
- `scrollEnabled={false}` on WebView
- Base64-encoded I/O over `postMessage` / `injectJavaScript`
- Multi-tab support with independent output buffers in the store
- Virtual keyboard toolbar (Tab, Esc, Ctrl, arrows)
- OAuth link detection and in-app browser URL rewriting

## Scripts

- `npm start` — Expo dev server
- `npm run start:clean` — `expo start --clear` (clears Metro cache)
- `npm run android` / `npm run ios` / `npm run web` — platform dev
- `npm run lint` — expo lint
- `npm run typecheck` — `tsc --noEmit`
- `npm run bundle-xterm` — re-bundle xterm.js HTML (runs automatically on `npm install`)

**Metro cache error ("Unable to deserialize cloned data"):** Delete `metro-file-map-*` files from the OS temp dir, then run `npm run start:clean`. If port 8081 is busy use `--port 8082`.

## Conventions

- **Dark theme only** — all colors from `constants/theme.ts` (`colors`, `fonts`, `spacing`, `fontSize`, `radii`)
- **Monospace:** `fonts.mono` (`JetBrainsMono_400Regular`)
- **Sans:** `fonts.sans` (`Inter_400Regular`)
- **Accent:** `#00E676` / `colors.accent`
- **Path aliases:** `@/` → project root
- **Store selectors:** `useStore((s) => s.field)` — always select individual fields to avoid re-renders
- **Clipboard:** always `expo-clipboard`, never `@react-native-clipboard/clipboard`
- **Tokens:** never log or display raw API keys / GitHub tokens — use `redactSecrets()` in `useAgent.ts`
