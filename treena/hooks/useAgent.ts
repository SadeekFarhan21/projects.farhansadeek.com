import { useRef, useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { useStore } from "@/store";
import type { ChatMessage } from "@/store";
import { streamChat, ChatMessage as APIChatMessage } from "@/lib/openrouter";
import { buildAgentDiff } from "@/lib/diff";
import {
  streamCompleteChatWithTools,
  buildMergedToolList,
  type ToolChatMessage,
  type ToolCallAcc,
  type TokenUsage,
} from "@/lib/openrouterTools";
import { getAllowedMcpServerNamesForAgent } from "@/lib/mcpBridgeSync";
import {
  invokeRemoteAgentTool,
  remoteWorkspaceSearch,
} from "@/lib/workspace/remoteWsBridge";
import { formatWorkspaceSearchContext } from "@/lib/codebaseSearch";
import { useFileSystem } from "@/hooks/useFileSystem";
import { resolveTerminalBrowseUrl } from "@/lib/terminalBrowseUrl";

const SYSTEM_PROMPT = `You are Treena, an AI coding assistant embedded in a mobile IDE. You help developers write, debug, and understand code directly on their phone or tablet.

Guidelines:
- Be concise and direct — mobile screens are small
- When suggesting code changes, wrap them in fenced code blocks with the language specified
- If the user shares a file, reference specific line numbers
- When asked to modify code, provide the complete updated function/block, not just the diff
- You can suggest file operations: create, rename, delete files
- Respond in markdown format for proper rendering`;

const REMOTE_AGENT_SYSTEM = `You are Treena, a coding assistant. The user's project lives in a REMOTE workspace — a real development environment with full tooling, NOT a sandbox.

Use tools to read, list, search (grep), patch/write files, and run shell commands. Prefer read_file before editing. Use apply_patch for targeted edits and write_file for full file create/replace. Summarize changes briefly. Respond in markdown.

**run_command** — use for short-lived commands (installs, builds, tests, linting):
- npm install, npm test, npm run build, npm run lint
- npx commands (e.g. npx create-react-app)
- node scripts, ls, cat, echo, pwd
- Optional **background: true** — detached spawn; returns immediately with pid (use for dev servers if not using start_server).

**start_server** — preferred way to start a long-running dev server in the background:
- Use for: npm start, npm run dev, npx vite, node server.js, next dev, python -m http.server, etc.
- Specify the port the server will listen on. Returns when the port is ready (or after 15s).
- The server persists for the entire session.
- After starting, use browse_url to open the preview in the user's browser.

**browse_url** — open a URL in the user's in-app browser:
- Use after starting a dev server to show the result.
- Localhost URLs (e.g. http://localhost:3000) are automatically rewritten to reach the workspace machine.

**Git operations** — git is an allowlisted binary in run_command. Use it freely:
- Inspect: git status, git log --oneline -10, git remote -v, git branch
- Stage & commit: git add <path> (or git add -A), then git commit -m "message"
- Push/pull: git push origin <branch>, git pull origin <branch>
- Set or fix a remote: git remote add origin <url> OR git remote set-url origin <url>
- For HTTPS auth using a GitHub token: git remote set-url origin https://<token>@github.com/<owner>/<repo>.git
- When the user gives a repo URL like https://github.com/owner/repo, extract owner/repo and build the authenticated URL yourself using the provided token.

Do not assume you know file contents without reading them. Do not refuse to run commands — this is a real dev environment. The user may include a pre-attached codebase search block from @codebase <pattern> in their message; use it together with tools as needed.

Tools prefixed with "mcp__" are from external MCP servers configured by the user. Use them when relevant. The format is mcp__<server>__<tool>.`;

const PLAN_MODE_SUFFIX = `

The user is in PLAN mode. Analyze their request and create a clear, numbered plan of what you will do.
List each step: which files you'll read, edit, or create, and what commands you'll run.
Do NOT call any tools. Just describe the plan step by step. Be specific about file paths and changes.`;

const MAX_TOOL_ROUNDS = 200;

function estimateTokens(messages: { content: string | null }[]): number {
  let chars = 0;
  for (const m of messages) chars += (m.content ?? "").length;
  return Math.ceil(chars / 4);
}

function extractWriteFilePreview(args: string): { path: string; content: string } | null {
  const pathMatch = args.match(/"path"\s*:\s*"([^"]*)"/);
  if (!pathMatch) return null;
  const contentStart = args.search(/"content"\s*:\s*"/);
  if (contentStart < 0) return null;
  const afterQuote = args.indexOf('"', contentStart + '"content"'.length + 1) + 1;
  let content = args.slice(afterQuote);
  if (content.endsWith('"}')) content = content.slice(0, -2);
  else if (content.endsWith('"')) content = content.slice(0, -1);
  try { content = JSON.parse('"' + content + '"'); } catch { /* use raw */ }
  return { path: pathMatch[1], content };
}

function extractPathArg(args: string): string | null {
  const pathMatch = args.match(/"path"\s*:\s*"([^"]*)"/);
  return pathMatch ? pathMatch[1] : null;
}

function payloadToText(name: string, payload: unknown): string | null {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (name === "read_file" && typeof obj.content === "string") {
    return obj.content;
  }
  if (name === "run_command") {
    if (obj.background === true && typeof obj.pid === "number") {
      const msg = typeof obj.message === "string" ? obj.message : "Started in background";
      return `${msg} (pid ${obj.pid})`;
    }
    const out = typeof obj.stdout === "string" ? obj.stdout : "";
    const err = typeof obj.stderr === "string" ? obj.stderr : "";
    const code =
      typeof obj.exitCode === "number" ? `\n(exit ${obj.exitCode})` : "";
    return `${out}${err ? `\n${err}` : ""}${code}`.trim();
  }
  if (name === "grep") {
    const matches = typeof obj.matches === "string" ? obj.matches : "";
    const stderr = typeof obj.stderr === "string" ? obj.stderr : "";
    return `${matches}${stderr ? `\n${stderr}` : ""}`.trim();
  }
  if (name === "list_dir" && Array.isArray(obj.entries)) {
    return (obj.entries as { name?: unknown; isDirectory?: unknown }[])
      .map((e) =>
        `${e.isDirectory ? "d" : "f"} ${typeof e.name === "string" ? e.name : ""}`.trim()
      )
      .join("\n");
  }
  if (name === "apply_patch") {
    const path = typeof obj.path === "string" ? obj.path : "";
    const changed = obj.changed === true ? "changed" : "unchanged";
    const hunks =
      typeof obj.hunksApplied === "number" ? `, hunks=${obj.hunksApplied}` : "";
    return `apply_patch ${changed}${hunks}${path ? ` (${path})` : ""}`;
  }
  // MCP tool results: { content: [{ type: "text", text: "..." }] }
  if (name.startsWith("mcp__") && Array.isArray(obj.content)) {
    return (obj.content as { type?: string; text?: string }[])
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
  }
  return null;
}

const LANG_MAP: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  py: "python", rb: "ruby", rs: "rust", go: "go",
  html: "html", css: "css", json: "json", md: "markdown",
  sh: "bash", yml: "yaml", yaml: "yaml", sql: "sql",
};

async function expandAtCodebase(text: string): Promise<string> {
  const re = /@codebase(?:\s+([^\n]+))?/;
  const m = text.match(re);
  if (!m) return text;
  const pattern = (m[1] ?? "").trim();
  if (!pattern) {
    return `${text}\n\n(@codebase: add a search pattern, e.g. @codebase myFunction)`;
  }
  const matches = await remoteWorkspaceSearch({ pattern, max_matches: 80 });
  const ctx = formatWorkspaceSearchContext(matches, 80);
  return `${text}\n\n--- Codebase search (${pattern}) — ${matches.length} match line(s) ---\n${ctx}\n---`;
}

export function useAgent() {
  const abortRef = useRef<AbortController | null>(null);
  const bgTimeRef = useRef<number | null>(null);
  const { refreshFileTree, saveEditBuffer } = useFileSystem();

  // When the app goes to background, note the time.
  // When it comes back, if the agent was mid-stream and enough time passed,
  // abort the stalled SSE connection so the error handler fires cleanly.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        bgTimeRef.current = Date.now();
      } else if (state === "active" && bgTimeRef.current) {
        const away = Date.now() - bgTimeRef.current;
        bgTimeRef.current = null;
        // If away > 3s and agent is still generating, the SSE stream is likely dead
        if (away > 3000 && abortRef.current) {
          abortRef.current.abort();
        }
      }
    });
    return () => sub.remove();
  }, []);

  const inputText = useStore((s) => s.agentInputText);
  const setInputText = useStore((s) => s.setAgentInputText);
  const apiKey = useStore((s) => s.apiKey);
  const selectedModel = useStore((s) => s.selectedModel);
  const addMessage = useStore((s) => s.addMessage);
  const updateLastMessage = useStore((s) => s.updateLastMessage);
  const patchMessage = useStore((s) => s.patchMessage);
  const setMessageStreaming = useStore((s) => s.setMessageStreaming);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setAgentStatus = useStore((s) => s.setAgentStatus);
  const currentFileContent = useStore((s) => s.currentFileContent);
  const currentFileName = useStore((s) => s.currentFileName);
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const githubToken = useStore((s) => s.githubToken);
  const setActiveAgentFile = useStore((s) => s.setActiveAgentFile);
  const setAgentStepCount = useStore((s) => s.setAgentStepCount);
  const setAgentThinkingStartedAt = useStore((s) => s.setAgentThinkingStartedAt);
  const setContextTokensUsed = useStore((s) => s.setContextTokensUsed);

  const sendMessageLocal = useCallback(
    async (text: string, assistantId: string) => {
      const controller = abortRef.current!;
      const apiMessages: APIChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
      ];

      if (currentFileContent && currentFileName) {
        apiMessages.push({
          role: "system",
          content: `The user currently has "${currentFileName}" open:\n\`\`\`\n${currentFileContent.slice(0, 4000)}\n\`\`\``,
        });
      }

      const store = useStore.getState();
      for (const msg of store.messages) {
        if (
          msg.role === "user" ||
          (msg.role === "assistant" && !msg.isStreaming)
        ) {
          apiMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      setContextTokensUsed(estimateTokens(apiMessages));

      let accumulated = "";
      let reasoningAcc = "";
      let firstToken = true;
      for await (const token of streamChat({
        model: selectedModel.id,
        messages: apiMessages,
        apiKey,
        signal: controller.signal,
        onReasoningDelta: (_d, accum) => {
          reasoningAcc = accum;
          patchMessage(assistantId, { thinking: reasoningAcc });
        },
      })) {
        if (firstToken) {
          setAgentStatus(null);
          firstToken = false;
        }
        accumulated += token;
        updateLastMessage(accumulated);
      }

      if (reasoningAcc) {
        patchMessage(assistantId, { thinking: reasoningAcc });
      }
      setMessageStreaming(assistantId, false);
    },
    [
      apiKey,
      selectedModel,
      updateLastMessage,
      setMessageStreaming,
      setAgentStatus,
      currentFileContent,
      currentFileName,
      patchMessage,
      setContextTokensUsed,
    ]
  );

  function redactSecrets(text: string): string {
    let out = text;
    if (githubToken) out = out.split(githubToken).join("***");
    out = out.replace(/gh[a-z]_[A-Za-z0-9_]{10,}/g, "***");
    out = out.replace(/github_pat_[A-Za-z0-9_]{10,}/g, "***");
    return out;
  }

  function describeToolCall(name: string, args: Record<string, unknown>): string {
    const p = (args.path ?? args.dir ?? "") as string;
    switch (name) {
      case "read_file":   return `Reading \`${p}\``;
      case "write_file":  return `Writing \`${p}\``;
      case "apply_patch": return `Patching \`${p}\``;
      case "list_dir":    return `Listing \`${p || "."}\``;
      case "grep":        return `Searching \`${args.pattern ?? ""}\`${p ? ` in \`${p}\`` : ""}`;
      case "run_command": {
        const bg = args.background === true ? " (background)" : "";
        return `Running \`${redactSecrets(String(args.command ?? name))}\`${bg}`;
      }
      case "start_server": return `Starting server \`${redactSecrets(String(args.command ?? ""))}\` on port ${args.port ?? "?"}`;
      case "browse_url":   return `Opening \`${args.url ?? ""}\``;
      default: {
        if (name.startsWith("mcp__")) {
          const toolName = name.split("__").slice(2).join("__");
          return `MCP: ${toolName}`;
        }
        return name;
      }
    }
  }

  function shortToolStatus(name: string, args: Record<string, unknown>): string {
    const p = (args.path ?? args.dir ?? "") as string;
    const file = p.split(/[\\/]/).pop() ?? p;
    switch (name) {
      case "read_file":   return `Reading ${file}`;
      case "write_file":  return `Writing ${file}`;
      case "apply_patch": return `Patching ${file}`;
      case "list_dir":    return `Listing ${file || "."}`;
      case "grep":        return `Searching "${args.pattern ?? ""}"`;
      case "run_command":   return args.background === true ? `Running in background` : `Running command`;
      case "start_server": return `Starting server`;
      case "browse_url":   return `Opening browser`;
      default: {
        if (name.startsWith("mcp__")) {
          const toolName = name.split("__").slice(2).join("__");
          return `MCP: ${toolName}`;
        }
        return name;
      }
    }
  }

  function formatThinkingDuration(ms: number): string {
    const seconds = Math.round(ms / 1000);
    if (seconds < 2) return "Thought briefly";
    if (seconds < 60) return `Thought for ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainSec = seconds % 60;
    return `Thought for ${minutes}m ${remainSec}s`;
  }

  function isLikelyDevServerCommand(command: string): boolean {
    const c = command.trim().toLowerCase();
    if (!c) return false;
    return (
      c.startsWith("npm run dev") ||
      c.startsWith("npm run start") ||
      c.startsWith("npx expo start") ||
      c.startsWith("npx vite") ||
      c.startsWith("vite") ||
      c.startsWith("next dev") ||
      c.startsWith("node server.js") ||
      c.startsWith("python -m http.server")
    );
  }

  function runCommandTimeoutHint(command: string, errorText: string): string | null {
    if (!/timeout/i.test(errorText)) return null;
    if (!isLikelyDevServerCommand(command)) return null;
    return "This command looks like a long-running dev server. Use start_server, run_command with background: true, or start it in the Terminal tab, then open the URL in Browser.";
  }

  const updateUsage = useCallback((usage: TokenUsage | undefined) => {
    if (usage) {
      setContextTokensUsed(usage.total_tokens);
    }
  }, [setContextTokensUsed]);

  const sendMessageRemote = useCallback(
    async (
      assistantId: string,
      lastUserId: string,
      lastUserApiContent: string,
      isPlanMode: boolean,
    ) => {
      const controller = abortRef.current!;
      const readCache = new Map<string, string>();
      const apiMessages: ToolChatMessage[] = [
        {
          role: "system",
          content: isPlanMode
            ? REMOTE_AGENT_SYSTEM + PLAN_MODE_SUFFIX
            : REMOTE_AGENT_SYSTEM,
        },
      ];
      if (githubToken) {
        apiMessages.push({
          role: "system",
          content: `GitHub token available: ${githubToken}\nFor authenticated HTTPS git operations use: https://${githubToken}@github.com/<owner>/<repo>.git`,
        });
      }

      const store = useStore.getState();
      for (const msg of store.messages) {
        if (
          msg.role === "user" ||
          (msg.role === "assistant" && !msg.isStreaming)
        ) {
          const content =
            msg.role === "user" && msg.id === lastUserId
              ? lastUserApiContent
              : msg.content;
          apiMessages.push({
            role: msg.role,
            content,
          });
        }
      }

      setContextTokensUsed(estimateTokens(apiMessages));

      if (isPlanMode) {
        let reasoningAcc = "";
        const turn = await streamCompleteChatWithTools({
          model: selectedModel.id,
          messages: apiMessages,
          apiKey,
          signal: controller.signal,
          tools: [],
          onContentDelta: (_d, accumulated) => {
            patchMessage(assistantId, { content: accumulated });
          },
          onReasoningDelta: (_d, accum) => {
            reasoningAcc = accum;
            patchMessage(assistantId, { thinking: reasoningAcc });
          },
        });

        updateUsage(turn.usage);
        patchMessage(assistantId, {
          content: turn.content || "(no plan generated)",
          isPlan: true,
          isStreaming: false,
          thinking: reasoningAcc || undefined,
        });
        setMessageStreaming(assistantId, false);
        setAgentStatus(null);
        return;
      }

      // Merge built-in tools with any MCP-discovered tools
      const mcpServers = useStore.getState().mcpServers;
      const mergedTools = buildMergedToolList(
        mcpServers,
        getAllowedMcpServerNamesForAgent(),
      );

      let rounds = 0;
      let currentAssistantId = assistantId;

      while (rounds < MAX_TOOL_ROUNDS) {
        rounds += 1;
        setAgentStepCount(rounds);

        if (rounds > 1) {
          const newId = `${Date.now()}_r${rounds}`;
          addMessage({
            id: newId,
            role: "assistant",
            content: "",
            isStreaming: true,
          });
          currentAssistantId = newId;
        }

        let reasoningAcc = "";
        let firstTokenThisTurn = true;
        let lastDiffTime = 0;
        const DIFF_THROTTLE_MS = 150;

        let turn!: Awaited<ReturnType<typeof streamCompleteChatWithTools>>;
        let sseRetries = 0;
        const MAX_SSE_RETRIES = 2;
        while (sseRetries < MAX_SSE_RETRIES) {
          try {
            turn = await streamCompleteChatWithTools({
              model: selectedModel.id,
              messages: apiMessages,
              apiKey,
              signal: controller.signal,
              tools: mergedTools,
              onContentDelta: (_d, accumulated) => {
                if (firstTokenThisTurn) {
                  setAgentStatus(null);
                  firstTokenThisTurn = false;
                }
                patchMessage(currentAssistantId, { content: accumulated, toolPreview: undefined });
              },
              onReasoningDelta: (_d, accum) => {
                reasoningAcc = accum;
                patchMessage(currentAssistantId, { thinking: reasoningAcc });
              },
              onToolCallDelta: (toolCalls) => {
                const wf = toolCalls.find((tc) => tc.function.name === "write_file");
                if (wf) {
                  const preview = extractWriteFilePreview(wf.function.arguments);
                  if (!preview || !preview.path) return;
                  const now = Date.now();
                  if (now - lastDiffTime < DIFF_THROTTLE_MS) return;
                  lastDiffTime = now;
                  const ext = preview.path.split(".").pop() || "";
                  const lang = LANG_MAP[ext] || ext;
                  const oldContent = readCache.get(preview.path) ?? "";
                  const newContent = preview.content || "";
                  const diff = buildAgentDiff(oldContent, newContent);
                  patchMessage(currentAssistantId, {
                    content: "",
                    toolPreview: {
                      type: "write_file",
                      path: preview.path,
                      language: lang,
                      addedCount: diff.addedCount,
                      removedCount: diff.removedCount,
                      diffLines: diff.lines,
                    },
                  });
                  return;
                }
                const ap = toolCalls.find((tc) => tc.function.name === "apply_patch");
                if (!ap) return;
                const path = extractPathArg(ap.function.arguments) ?? "file";
                patchMessage(currentAssistantId, {
                  content: "",
                  toolPreview: {
                    type: "apply_patch",
                    path,
                    language: "",
                    addedCount: 0,
                    removedCount: 0,
                    diffLines: [],
                  },
                });
              },
            });
            break; // success
          } catch (sseErr: unknown) {
            if (controller.signal.aborted) throw sseErr;
            sseRetries++;
            if (sseRetries >= MAX_SSE_RETRIES) throw sseErr;
            setAgentStatus("Connection lost, retrying...");
            // Reset streaming state for retry
            firstTokenThisTurn = true;
            reasoningAcc = "";
            await new Promise((r) => setTimeout(r, 2000));
            setAgentStatus("Thinking...");
          }
        }

        updateUsage(turn.usage);

        if (reasoningAcc) {
          patchMessage(currentAssistantId, { thinking: reasoningAcc });
        }

        const calls = turn.tool_calls?.filter((c) => c.type === "function");
        if (!calls?.length) {
          setAgentStatus(null);
          patchMessage(currentAssistantId, {
            content: turn.content || "(no response)",
          });
          setMessageStreaming(currentAssistantId, false);
          setActiveAgentFile(null);
          return;
        }

        patchMessage(currentAssistantId, {
          content: turn.content || "",
          isStreaming: false,
          toolPreview: undefined,
        });
        setMessageStreaming(currentAssistantId, false);

        setAgentStatus("Thinking...");

        apiMessages.push({
          role: "assistant",
          content: turn.content || null,
          tool_calls: calls,
        });

        for (const tc of calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}") as Record<
              string,
              unknown
            >;
          } catch {
            args = {};
          }

          const filePath = (args.path ?? "") as string;
          if (
            tc.function.name === "read_file" ||
            tc.function.name === "write_file" ||
            tc.function.name === "apply_patch"
          ) {
            setActiveAgentFile(filePath);
          }

          if (tc.function.name === "write_file") {
            const name = filePath.split("/").pop() || filePath;
            setAgentStatus(`Writing ${name}...`);
          } else if (tc.function.name === "apply_patch") {
            const name = filePath.split("/").pop() || filePath;
            setAgentStatus(`Patching ${name}...`);
          } else if (tc.function.name === "read_file") {
            const name = filePath.split("/").pop() || filePath;
            setAgentStatus(`Reading ${name}...`);
          } else if (tc.function.name === "run_command") {
            setAgentStatus("Running command...");
          } else if (tc.function.name === "start_server") {
            setAgentStatus("Starting server...");
          } else if (tc.function.name === "grep") {
            setAgentStatus("Searching codebase...");
          } else if (tc.function.name === "list_dir") {
            setAgentStatus("Listing directory...");
          } else if (tc.function.name === "browse_url") {
            setAgentStatus("Browsing URL...");
          }

          let payload: unknown;
          try {
            payload = await invokeRemoteAgentTool(tc.function.name, args);
            if (tc.function.name === "write_file" || tc.function.name === "apply_patch") {
              await refreshFileTree();
            }
          } catch (err) {
            payload = {
              error: err instanceof Error ? err.message : String(err),
            };
          }

          let toolDiff: ChatMessage["toolDiff"];
          let toolOutput: ChatMessage["toolOutput"];

          if (tc.function.name === "read_file") {
            const text = payloadToText(tc.function.name, payload);
            if (typeof text === "string") {
              readCache.set(args.path as string, text);
              toolOutput = text.slice(0, 500);
            }
          }
          if (tc.function.name === "write_file") {
            const oldContent = readCache.get(args.path as string) ?? "";
            const { addedCount, removedCount, lines } = buildAgentDiff(
              oldContent,
              args.content as string
            );
            toolDiff = {
              filename: args.path as string,
              addedCount,
              removedCount,
              lines,
              oldContent,
              newContent: args.content as string,
            };
          }
          if (tc.function.name === "apply_patch" && payload && typeof payload === "object") {
            const p = payload as Record<string, unknown>;
            const before = typeof p.before === "string" ? p.before : "";
            const after = typeof p.after === "string" ? p.after : "";
            const resultPath =
              typeof p.path === "string" ? p.path : (args.path as string);
            const { addedCount, removedCount, lines } = buildAgentDiff(
              before,
              after
            );
            toolDiff = {
              filename: resultPath,
              addedCount,
              removedCount,
              lines,
              oldContent: before,
              newContent: after,
            };
          }
          if (tc.function.name === "run_command") {
            const text = payloadToText(tc.function.name, payload);
            if (typeof text === "string") toolOutput = text.slice(0, 2000);
            const payloadError =
              payload && typeof payload === "object" && "error" in payload
                ? String((payload as { error?: unknown }).error ?? "")
                : "";
            if (!toolOutput && payloadError) {
              toolOutput = payloadError;
            }
            const timeoutHint = runCommandTimeoutHint(
              String(args.command ?? ""),
              payloadError || text || ""
            );
            if (timeoutHint) {
              toolOutput = `${toolOutput ? `${toolOutput}\n\n` : ""}${timeoutHint}`;
            }
          }
          if (tc.function.name === "grep") {
            const text = payloadToText(tc.function.name, payload);
            if (typeof text === "string") toolOutput = text.slice(0, 1000);
          }
          if (tc.function.name === "list_dir") {
            const text = payloadToText(tc.function.name, payload);
            if (typeof text === "string") toolOutput = text.slice(0, 1000);
          }
          if (tc.function.name === "apply_patch" && !toolOutput) {
            const text = payloadToText(tc.function.name, payload);
            if (typeof text === "string") toolOutput = text;
          }
          if (tc.function.name === "start_server") {
            const text = payloadToText(tc.function.name, payload);
            if (typeof text === "string") toolOutput = text.slice(0, 2000);
          }
          if (tc.function.name === "browse_url") {
            const resultUrl =
              payload && typeof payload === "object"
                ? String((payload as Record<string, unknown>).url ?? args.url)
                : String(args.url ?? "");
            const st = useStore.getState();
            const { loadUrl } = resolveTerminalBrowseUrl(resultUrl, {
              cloudSessionStatus: st.cloudSessionStatus,
              cloudSessionPublicIp: st.cloudSessionPublicIp,
              cloudSessionWsUrl: st.cloudSessionWsUrl,
              remoteWorkspaceEnabled: st.remoteWorkspaceEnabled,
              remoteWorkspaceWsUrl: st.remoteWorkspaceWsUrl,
            });
            useStore.getState().addBrowserTab(loadUrl);
            toolOutput = `Opened browser to ${loadUrl}`;
          }

          addMessage({
            id: `tool_${tc.id}`,
            role: "tool",
            toolName: tc.function.name,
            content: describeToolCall(tc.function.name, args),
            toolDiff,
            toolOutput: toolOutput ? redactSecrets(toolOutput) : toolOutput,
          });

          apiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content:
              typeof payload === "string"
                ? payload
                : JSON.stringify(payload ?? null),
          });
        }

        setActiveAgentFile(null);
      }

      setAgentStatus(null);
      setActiveAgentFile(null);
      patchMessage(currentAssistantId, { content: "(agent loop completed)" });
      setMessageStreaming(currentAssistantId, false);
    },
    [
      apiKey,
      selectedModel,
      githubToken,
      addMessage,
      patchMessage,
      setMessageStreaming,
      setAgentStatus,
      setActiveAgentFile,
      setAgentStepCount,
      setContextTokensUsed,
      refreshFileTree,
      updateUsage,
    ]
  );

  const executePlan = useCallback(
    async (planMessageId: string) => {
      const store = useStore.getState();
      const planMsg = store.messages.find((m) => m.id === planMessageId);
      if (!planMsg) return;

      patchMessage(planMessageId, { planApproved: true });
      useStore.getState().setAgentMode("agent");

      const approvalId = Date.now().toString();
      addMessage({
        id: approvalId,
        role: "user",
        content: "Approved. Execute the plan above.",
      });

      const assistantId = (Date.now() + 1).toString();
      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      });

      setIsGenerating(true);
      setAgentThinkingStartedAt(Date.now());
      setAgentStatus("Thinking...");
      setAgentStepCount(0);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await sendMessageRemote(
          assistantId,
          approvalId,
          "Approved. Execute the plan above.",
          false,
        );
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        if (e.name !== "AbortError") {
          patchMessage(assistantId, {
            content: `Error: ${e.message || "Failed to execute plan"}`,
          });
        }
        setMessageStreaming(assistantId, false);
      } finally {
        setIsGenerating(false);
        const startedAt = useStore.getState().agentThinkingStartedAt;
        if (startedAt) {
          const elapsed = Date.now() - startedAt;
          setAgentStatus(formatThinkingDuration(elapsed));
          setTimeout(() => setAgentStatus(null), 3000);
        } else {
          setAgentStatus(null);
        }
        setAgentThinkingStartedAt(null);
        setActiveAgentFile(null);
        setAgentStepCount(0);
        abortRef.current = null;
      }
    },
    [
      addMessage,
      patchMessage,
      setMessageStreaming,
      setIsGenerating,
      setAgentStatus,
      setAgentThinkingStartedAt,
      setActiveAgentFile,
      setAgentStepCount,
      sendMessageRemote,
    ]
  );

  const rejectPlan = useCallback(
    (planMessageId: string) => {
      patchMessage(planMessageId, { planApproved: false });
    },
    [patchMessage]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!apiKey) return;

      // Flush any in-flight edit to disk before the agent runs so remote tool
      // reads see the latest content (the normal autosave is debounced 1.5s).
      try {
        await saveEditBuffer();
      } catch {
        /* best-effort; proceed even if save fails */
      }

      const store = useStore.getState();
      const isPlanMode = store.agentMode === "plan";

      const userMsg = {
        id: Date.now().toString(),
        role: "user" as const,
        content: text,
      };
      addMessage(userMsg);

      const assistantId = (Date.now() + 1).toString();
      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      });

      setIsGenerating(true);
      setAgentStepCount(0);
      setAgentThinkingStartedAt(Date.now());
      setAgentStatus("Thinking...");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let lastUserApiContent = text;
        if (remoteWorkspaceEnabled && /@codebase\b/.test(text)) {
          try {
            lastUserApiContent = await expandAtCodebase(text);
          } catch (err) {
            lastUserApiContent = `${text}\n\n(@codebase failed: ${
              err instanceof Error ? err.message : String(err)
            })`;
          }
        }
        if (remoteWorkspaceEnabled) {
          await sendMessageRemote(assistantId, userMsg.id, lastUserApiContent, isPlanMode);
        } else {
          await sendMessageLocal(text, assistantId);
        }
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        if (e.name !== "AbortError") {
          updateLastMessage(
            `Error: ${e.message || "Failed to get response"}`
          );
        }
        setMessageStreaming(assistantId, false);
      } finally {
        setIsGenerating(false);
        const startedAt = useStore.getState().agentThinkingStartedAt;
        if (startedAt) {
          const elapsed = Date.now() - startedAt;
          setAgentStatus(formatThinkingDuration(elapsed));
          setTimeout(() => setAgentStatus(null), 3000);
        } else {
          setAgentStatus(null);
        }
        setAgentThinkingStartedAt(null);
        setActiveAgentFile(null);
        setAgentStepCount(0);
        abortRef.current = null;
      }
    },
    [
      apiKey,
      remoteWorkspaceEnabled,
      addMessage,
      updateLastMessage,
      setMessageStreaming,
      setIsGenerating,
      setAgentStatus,
      setActiveAgentFile,
      setAgentStepCount,
      currentFileContent,
      currentFileName,
      sendMessageLocal,
      sendMessageRemote,
      saveEditBuffer,
    ]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    const startedAt = useStore.getState().agentThinkingStartedAt;
    if (startedAt) {
      const elapsed = Date.now() - startedAt;
      setAgentStatus(formatThinkingDuration(elapsed));
      setTimeout(() => setAgentStatus(null), 3000);
    } else {
      setAgentStatus(null);
    }
    setAgentThinkingStartedAt(null);
    setActiveAgentFile(null);
    setAgentStepCount(0);
  }, [setIsGenerating, setAgentStatus, setAgentThinkingStartedAt, setActiveAgentFile, setAgentStepCount]);

  return {
    inputText,
    setInputText,
    sendMessage,
    stopGeneration,
    executePlan,
    rejectPlan,
  };
}
