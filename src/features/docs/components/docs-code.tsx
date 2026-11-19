"use client";

import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

type DocsCodeProps = {
  code: string;
  /** Deskripsi untuk screen reader. */
  label: string;
  /** Jadikan URL dan alamat Solana bisa diklik (alamat → Solana Explorer). */
  linkify?: boolean;
};

const LINK_PATTERN = /(https?:\/\/[^\s]+)|\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
const LINK_CLASS =
  "text-brand-200 underline decoration-brand-400/40 underline-offset-4 hover:decoration-brand-200";

function linkifyCode(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of code.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(code.slice(cursor, start));

    const [text, url, address] = match;
    const href = url ?? `https://explorer.solana.com/address/${address}`;
    nodes.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {text}
      </a>,
    );
    cursor = start + text.length;
  }

  if (cursor < code.length) nodes.push(code.slice(cursor));
  return nodes;
}

/** Kotak kode polos (tanpa pewarnaan sintaks). Tombol salin muncul saat hover. */
export function DocsCode({ code, label, linkify = false }: DocsCodeProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="group relative mt-6 overflow-hidden rounded-xl border border-border-subtle bg-white/3">
      <button
        type="button"
        onClick={() => void copy(code)}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-fg-muted opacity-0 transition hover:bg-white/10 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 active:scale-90"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-4 text-success" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
      </button>

      {/* tabIndex=0: area yang bisa di-scroll harus bisa dijangkau keyboard */}
      <pre
        tabIndex={0}
        aria-label={label}
        className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-fg"
      >
        <code>{linkify ? linkifyCode(code) : code}</code>
      </pre>
    </div>
  );
}