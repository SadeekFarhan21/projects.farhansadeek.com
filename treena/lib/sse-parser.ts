export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
}

/**
 * Buffered SSE parser that handles chunks split across reads.
 * Yields complete SSE events as they arrive.
 */
export class SSEParser {
  private buffer = "";

  /**
   * Feed a chunk of text and return any complete events.
   */
  feed(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    // Split on double newlines (event boundaries)
    const parts = this.buffer.split(/\n\n/);

    // Last part may be incomplete, keep it in the buffer
    this.buffer = parts.pop() ?? "";

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const event: SSEEvent = { data: "" };
      const lines = trimmed.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          event.data += (event.data ? "\n" : "") + line.slice(6);
        } else if (line.startsWith("event: ")) {
          event.event = line.slice(7);
        } else if (line.startsWith("id: ")) {
          event.id = line.slice(4);
        } else if (line === "data:") {
          event.data += event.data ? "\n" : "";
        }
      }

      if (event.data || event.event) {
        events.push(event);
      }
    }

    return events;
  }

  reset() {
    this.buffer = "";
  }
}
