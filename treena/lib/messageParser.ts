export type MessageSegment =
  | { type: "text"; content: string }
  | {
      type: "code";
      language: string;
      filename: string | null;
      content: string;
      isDiff: boolean;
      isComplete: boolean;
    };

export function parseMessageContent(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const regex = /```(\w*(?::[^\s`]*)?)?[ \t]*\n([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    }

    const tag = match[1] || "";
    const code = match[2];

    // Parse language and optional filename from tag (e.g. "typescript:App.tsx")
    let language = "";
    let filename: string | null = null;
    if (tag.includes(":")) {
      const colonIdx = tag.indexOf(":");
      language = tag.slice(0, colonIdx);
      filename = tag.slice(colonIdx + 1);
    } else {
      language = tag;
    }

    // Detect diff: language is "diff" or has 2+ "+" lines and 1+ "-" lines
    const lines = code.split("\n");
    const plusLines = lines.filter((l) => l.startsWith("+")).length;
    const minusLines = lines.filter((l) => l.startsWith("-")).length;
    const isDiff = language === "diff" || (plusLines >= 2 && minusLines >= 1);

    // Detect completeness: original match includes closing ```
    const fullMatch = match[0];
    const isComplete = fullMatch.endsWith("```");

    segments.push({
      type: "code",
      language,
      filename,
      content: code,
      isDiff,
      isComplete,
    });

    lastIndex = match.index + fullMatch.length;
  }

  // Remaining text after last code block
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: "text", content: text });
    }
  }

  // If no code blocks found, return the whole content as text
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "text", content: content.trim() });
  }

  return segments;
}
