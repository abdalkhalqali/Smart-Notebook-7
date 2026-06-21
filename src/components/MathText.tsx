import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
  dir?: "rtl" | "ltr";
}

/**
 * MathText — renders a string that may contain LaTeX math expressions.
 * Supports $inline$ and $$block$$ notation.
 * Falls back to plain text if KaTeX rendering fails.
 */
export default function MathText({ text, className = "", dir = "rtl" }: MathTextProps) {
  if (!text) return null;

  // Split by $$block$$ first, then $inline$
  const segments = splitMathSegments(text);

  return (
    <span className={className} dir={dir}>
      {segments.map((seg, i) => {
        if (seg.type === "block-math") {
          return <BlockMath key={i} latex={seg.content} />;
        } else if (seg.type === "inline-math") {
          return <InlineMath key={i} latex={seg.content} />;
        } else {
          return <span key={i}>{seg.content}</span>;
        }
      })}
    </span>
  );
}

interface Segment {
  type: "text" | "inline-math" | "block-math";
  content: string;
}

function splitMathSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Match $$...$$ (block) or $...$ (inline)
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("$$")) {
      segments.push({ type: "block-math", content: raw.slice(2, -2).trim() });
    } else {
      segments.push({ type: "inline-math", content: raw.slice(1, -1).trim() });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: text }];
}

function InlineMath({ latex }: { latex: string }) {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: "html",
      trust: false,
    });
    return <span className="katex-inline mx-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <code className="text-amber-400 bg-slate-800 px-1 rounded text-xs">{latex}</code>;
  }
}

function BlockMath({ latex }: { latex: string }) {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: "html",
      trust: false,
    });
    return (
      <span className="katex-block block my-2 text-center overflow-x-auto" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
    );
  } catch {
    return <code className="block text-amber-400 bg-slate-800 px-2 py-1 rounded text-xs my-1">{latex}</code>;
  }
}
