'use client';

import { useMemo } from 'react';
import katex from 'katex';

// Renders text with inline LaTeX ($...$) as KaTeX HTML
export function KaTeXText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => {
    // Split on $ delimiters, alternating between text and math
    const parts = text.split(/\$(.*?)\$/g);
    return parts
      .map((part, i) => {
        if (i % 2 === 1) {
          // Math part
          try {
            return katex.renderToString(part, { throwOnError: false });
          } catch {
            return part;
          }
        }
        // Text part — escape HTML
        return part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      })
      .join('');
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
