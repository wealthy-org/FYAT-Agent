"use client";

import { Check, Copy } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/**
 * Urutan grup = urutan TOKEN_CLASSES.
 * Komentar didahulukan, lalu string, keyword, dan angka (termasuk bigint "5_000n").
 */
const TOKEN_PATTERN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(import|from|const|await|true|false|null)\b|\b(\d[\d_]*n?)\b/g;

const TOKEN_CLASSES = [
  "text-fg-subtle", // comment
  "text-brand-200", // string
  "text-brand-400", // keyword
  "text-sky-300", // number
] as const;

/** Menghasilkan node React (bukan string HTML), sehingga teks selalu ter-escape. */
function highlightLine(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(line.slice(cursor, start));

    const groupIndex = match.slice(1).findIndex((group) => group !== undefined);
    nodes.push(
      <span key={start} className={TOKEN_CLASSES[groupIndex]}>
        {match[0]}
      </span>,
    );
    cursor = start + match[0].length;
  }

  if (cursor < line.length) nodes.push(line.slice(cursor));
  return nodes;
}

type CodeBlockProps = {
  code: string;
  filename: string;
  /** Deskripsi untuk screen reader. */
  label: string;
};

export function CodeBlock({ code, filename, label }: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard();
  const lines = code.split("\n");

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-canvas">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <span className="font-mono text-[11px] text-fg-subtle">{filename}</span>

        <button
          type="button"
          onClick={() => void copy(code)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-3.5 text-success" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* tabIndex=0: area yang bisa di-scroll harus bisa dijangkau keyboard */}
      <pre
        tabIndex={0}
        aria-label={label}
        className="overflow-x-auto p-4 font-mono text-xs leading-6 text-fg"
      >
        <code>
          {lines.map((line, index) => (
            <Fragment key={index}>
              {highlightLine(line)}
              {"\n"}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}