import { fetch } from "expo/fetch";
import { SSEParser } from "./sse-parser";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  model: string;
  messages: ChatMessage[];
  apiKey: string;
  signal?: AbortSignal;
  onReasoningDelta?: (delta: string, accumulated: string) => void;
}

/**
 * Async generator that streams chat completions from OpenRouter.
 * Yields individual content tokens as they arrive.
 */
export async function* streamChat({
  model,
  messages,
  apiKey,
  signal,
  onReasoningDelta,
}: StreamOptions): AsyncGenerator<string, void, unknown> {
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
      stream: true,
    }),
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
  let reasoning = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.feed(chunk);

      for (const event of events) {
        if (event.data === "[DONE]") return;

        try {
          const parsed = JSON.parse(event.data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          const content = delta.content;
          if (content) {
            yield content;
          }

          const reasoningPiece = delta.reasoning_content ?? delta.reasoning;
          if (typeof reasoningPiece === "string" && reasoningPiece.length > 0) {
            reasoning += reasoningPiece;
            onReasoningDelta?.(reasoningPiece, reasoning);
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
