import { Fragment } from "react";

import { cn } from "@/lib/utils";

/**
 * Tiny, safe markdown renderer — headings, bold/italic/code, lists, hr, and
 * paragraphs. No HTML passthrough. Enough for notes previews and study guides.
 */
export function MarkdownLite({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] | null = null;
  let ordered = false;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list;
    blocks.push(
      ordered ? (
        <ol key={key++} className="my-3 ml-5 list-decimal space-y-1.5 marker:text-muted">
          {items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ol>
      ) : (
        <ul key={key++} className="my-3 ml-5 list-disc space-y-1.5 marker:text-muted">
          {items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const Tag = (["h2", "h3", "h4", "h5"][level - 1] ?? "h5") as "h2";
      blocks.push(
        <Tag
          key={key++}
          className={cn(
            "font-extrabold tracking-tight text-foreground",
            level === 1 && "mt-6 text-2xl first:mt-0",
            level === 2 && "mt-5 text-xl first:mt-0",
            level >= 3 && "mt-4 text-lg first:mt-0",
          )}
        >
          {inline(h[2])}
        </Tag>,
      );
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      blocks.push(<hr key={key++} className="my-5 border-border" />);
      continue;
    }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const isOrdered = Boolean(ol);
      if (list && ordered !== isOrdered) flushList();
      ordered = isOrdered;
      list = list ?? [];
      list.push((ul ?? ol)![1]);
      continue;
    }
    flushList();
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed text-foreground/90">
        {inline(line.trim())}
      </p>,
    );
  }
  flushList();

  return <div className={cn("text-[0.95rem]", className)}>{blocks}</div>;
}

function inline(text: string): React.ReactNode {
  // order matters: code first so ** inside code is literal
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(
        <code
          key={i++}
          className="rounded bg-foreground/8 px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**")) {
      parts.push(
        <strong key={i++} className="font-bold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={i++} className="italic">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return parts;
}
