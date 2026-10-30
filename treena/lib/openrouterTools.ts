import { fetch } from "expo/fetch";
import { SSEParser } from "./sse-parser";
import type { McpServerInfo } from "@/store";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Messages for tool-enabled completions (OpenRouter / OpenAI shape). */
export type ToolChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AssistantTurn {
  content: string;
  tool_calls?: ToolCall[];
  finish_reason?: string;
  reasoning?: string;
  usage?: TokenUsage;
}

export interface CompleteChatWithToolsOptions {
  model: string;
  messages: ToolChatMessage[];
  apiKey: string;
  signal?: AbortSignal;
}

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export interface StreamChatWithToolsOptions extends CompleteChatWithToolsOptions {
  onContentDelta?: (delta: string, accumulated: string) => void;
  onReasoningDelta?: (delta: string, accumulated: string) => void;
  onToolCallDelta?: (toolCalls: ToolCallAcc[]) => void;
  tools?: ToolDefinition[];
}

export const REMOTE_AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description:
        "Read a UTF-8 text file from the remote workspace. Path is relative to project root (no leading slash).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path, e.g. package.json" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Create or fully overwrite a UTF-8 text file in the remote workspace. Prefer apply_patch for targeted edits.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: {
            type: "string",
            description:
              "Full file contents. Use for new files or full rewrites; use apply_patch for partial changes.",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_dir",
      description:
        "List files and folders in a directory (one level). Empty path lists workspace root.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path; omit or \"\" for root" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "grep",
      description:
        "Search file contents under the workspace (ripgrep when available). Excludes node_modules and .git.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Search pattern (fixed string, not regex advanced)" },
          path: {
            type: "string",
            description: "Optional subdirectory relative path to search under; default entire workspace",
          },
          max_matches: { type: "integer", description: "Cap on result lines (default 80)" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description:
        "Run a shell command in the workspace root. First token must be an allowlisted binary: npm, npx, node, git, ls, cat, echo, pwd. " +
        "Use for installs, builds, tests, lint, short scripts. " +
        "For long-lived dev servers prefer start_server, or set background: true to spawn detached (returns immediately with pid; max 3 concurrent). " +
        "Without background, commands time out after 60s.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: 'e.g. "npm test" or "ls -la"' },
          background: {
            type: "boolean",
            description:
              "If true, run detached in background and return immediately (pid in result). Same allowlist. Use for dev servers when not using start_server.",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "start_server",
      description:
        "Start a long-running dev server in the background. The process persists for the session (not killed after 60s). " +
        "Use instead of run_command for: npm start, npm run dev, npx vite, node server.js, next dev, python -m http.server, etc. " +
        "Returns whether the server became ready (port accepting connections within 15s). " +
        "After starting, use browse_url to open the preview.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: 'e.g. "npm run dev" or "node server.js"' },
          port: { type: "integer", description: "Port the server will listen on, e.g. 3000, 5173, 8080" },
        },
        required: ["command", "port"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_url",
      description:
        "Open a URL in the user's in-app browser tab. Use after starting a dev server to show the result. " +
        "Localhost URLs are automatically rewritten to the workspace machine's address.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: 'e.g. "http://localhost:3000"' },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "apply_patch",
      description:
        "Apply targeted in-file replacements to an existing UTF-8 file. Prefer this over write_file when editing only part of a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path to patch (existing file).",
          },
          hunks: {
            type: "array",
            description:
              "Ordered replacement operations. Each hunk replaces oldText with newText; by default oldText must match exactly once.",
            items: {
              type: "object",
              properties: {
                oldText: { type: "string", description: "Exact text to find." },
                newText: { type: "string", description: "Replacement text." },
                replaceAll: {
                  type: "boolean",
                  description:
                    "Set true only when intentionally replacing every occurrence of oldText.",
                },
              },
              required: ["oldText", "newText"],
            },
          },
        },
        required: ["path", "hunks"],
      },
    },
  },
];

/**
 * Merge built-in tools with MCP-discovered tools for the LLM.
 */
export function buildMergedToolList(
  mcpServers: Record<string, McpServerInfo>,
  /** When set, only include MCP tools for these server names (catalog policy). */
  allowedMcpServerNames?: Set<string> | null,
): ToolDefinition[] {
  const mcpTools: ToolDefinition[] = [];
  for (const [serverName, server] of Object.entries(mcpServers)) {
    if (allowedMcpServerNames && !allowedMcpServerNames.has(serverName)) {
      continue;
    }
    if (server.status !== "connected") continue;
    for (const tool of server.tools) {
      mcpTools.push({
        type: "function" as const,
        function: {
          name: tool.namespacedName,
          description: `[MCP: ${serverName}] ${tool.description}`,
          parameters: tool.parameters as Record<string, unknown>,
        },
      });
    }
  }
  if (mcpTools.length === 0) return REMOTE_AGENT_TOOLS as ToolDefinition[];
  return [...(REMOTE_AGENT_TOOLS as ToolDefinition[]), ...mcpTools];
}

function normalizeToolCalls(raw: unknown): ToolCall[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: ToolCall[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === "string"
        ? o.id
        : typeof o.id === "number"
          ? String(o.id)
          : "";
    const type = o.type === "function" ? "function" : null;
    const fn = o.function as Record<string, unknown> | undefined;
    const name = fn && typeof fn.name === "string" ? fn.name : "";
    const args =
      fn && typeof fn.arguments === "string"
        ? fn.arguments
        : fn && typeof fn.arguments === "object"
          ? JSON.stringify(fn.arguments)
          : "{}";
    if (id && type && name) {
      out.push({ id, type, function: { name, arguments: args } });
    }
  }
  return out.length ? out : undefined;
}

export type ToolCallAcc = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

function mergeToolCallDelta(
  byIndex: Map<number, ToolCallAcc>,
  raw: Record<string, unknown>
): void {
  const idx =
    typeof raw.index === "number"
      ? raw.index
      : typeof raw.index === "string"
        ? parseInt(raw.index, 10)
        : 0;
  let acc = byIndex.get(idx);
  if (!acc) {
    acc = { id: "", type: "function", function: { name: "", arguments: "" } };
    byIndex.set(idx, acc);
  }
  if (typeof raw.id === "string" && raw.id) acc.id = raw.id;
  if (raw.type === "function") acc.type = "function";
  const fn = raw.function as Record<string, unknown> | undefined;
  if (fn && typeof fn === "object") {
    if (typeof fn.name === "string" && fn.name) acc.function.name = fn.name;
    if (typeof fn.arguments === "string")
      acc.function.arguments += fn.arguments;
  }
}

/**
 * Streaming completion with tools: streams assistant text; accumulates tool_calls from deltas.
 */
export async function streamCompleteChatWithTools({
  model,
  messages,
  apiKey,
  signal,
  onContentDelta,
  onReasoningDelta,
  onToolCallDelta,
  tools,
}: StreamChatWithToolsOptions): Promise<AssistantTurn> {
  const activeTools = tools ?? REMOTE_AGENT_TOOLS;
  const bodyPayload: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  };
  if (activeTools.length > 0) {
    bodyPayload.tools = activeTools;
    bodyPayload.tool_choice = "auto";
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://treena.app",
      "X-Title": "Treena IDE",
    },
    body: JSON.stringify(bodyPayload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error("No response body");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  let content = "";
  let reasoning = "";
  const toolCallsByIndex = new Map<number, ToolCallAcc>();
  let finishReason: string | undefined;
  let usage: TokenUsage | undefined;

  try {
    streamLoop: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.feed(chunk);

      for (const event of events) {
        if (event.data === "[DONE]") {
          break streamLoop;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          continue;
        }

        const err = parsed.error as Record<string, unknown> | undefined;
        if (err && typeof err.message === "string") {
          throw new Error(`OpenRouter: ${err.message}`);
        }

        const rawUsage = parsed.usage as Record<string, unknown> | undefined;
        if (rawUsage && typeof rawUsage === "object") {
          usage = {
            prompt_tokens: (rawUsage.prompt_tokens as number) ?? 0,
            completion_tokens: (rawUsage.completion_tokens as number) ?? 0,
            total_tokens: (rawUsage.total_tokens as number) ?? 0,
          };
        }

        const choices = parsed.choices as Record<string, unknown>[] | undefined;
        const choice = choices?.[0] as Record<string, unknown> | undefined;
        if (!choice) continue;

        const delta = choice.delta as Record<string, unknown> | undefined;
        if (delta) {
          const piece = delta.content;
          if (typeof piece === "string" && piece.length > 0) {
            content += piece;
            onContentDelta?.(piece, content);
          }

          const reasoningPiece =
            (delta.reasoning_content as string | undefined) ??
            (delta.reasoning as string | undefined);
          if (typeof reasoningPiece === "string" && reasoningPiece.length > 0) {
            reasoning += reasoningPiece;
            onReasoningDelta?.(reasoningPiece, reasoning);
          }

          const tcalls = delta.tool_calls as Record<string, unknown>[] | undefined;
          if (Array.isArray(tcalls)) {
            for (const tc of tcalls) {
              if (tc && typeof tc === "object") {
                mergeToolCallDelta(toolCallsByIndex, tc as Record<string, unknown>);
              }
            }
            onToolCallDelta?.([...toolCallsByIndex.values()]);
          }
        }

        if (typeof choice.finish_reason === "string") {
          finishReason = choice.finish_reason;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const indices = [...toolCallsByIndex.keys()].sort((a, b) => a - b);
  const assembled: ToolCall[] = [];
  for (const i of indices) {
    const acc = toolCallsByIndex.get(i);
    if (!acc) continue;
    if (acc.id && acc.function.name) {
      assembled.push({
        id: acc.id,
        type: "function",
        function: {
          name: acc.function.name,
          arguments: acc.function.arguments || "{}",
        },
      });
    }
  }

  return {
    content,
    tool_calls: assembled.length ? assembled : undefined,
    finish_reason: finishReason,
    reasoning: reasoning || undefined,
    usage,
  };
}

/**
 * Non-streaming completion with tools (remote agent loop).
 */
export async function completeChatWithTools({
  model,
  messages,
  apiKey,
  signal,
}: CompleteChatWithToolsOptions): Promise<AssistantTurn> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://treena.app",
      "X-Title": "Treena IDE",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: REMOTE_AGENT_TOOLS,
      tool_choice: "auto",
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenRouter: missing choices");
  }
  const choice = choices[0] as Record<string, unknown> | undefined;
  if (!choice || typeof choice !== "object") {
    throw new Error("OpenRouter: invalid choices[0]");
  }
  const message = choice.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") {
    throw new Error("OpenRouter: missing choices[0].message");
  }

  const content =
    typeof message.content === "string"
      ? message.content
      : message.content === null
        ? ""
        : "";
  const tool_calls = normalizeToolCalls(message.tool_calls);
  const finish_reason =
    typeof choice.finish_reason === "string" ? choice.finish_reason : undefined;

  return { content, tool_calls, finish_reason };
}
