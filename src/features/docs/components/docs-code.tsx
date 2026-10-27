"use client";

import { Check, Copy } from "lucide-react";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

type DocsCodeProps = {
  code: string;
  /** Deskripsi untuk screen reader. */
  label: string;
};

/** Kotak kode polos (tanpa pewarnaan sintaks). Tombol salin muncul saat hover. */
export function DocsCode({ code, label }: DocsCodeProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="group relative mt-6 overflow-hidden rounded-xl border border-border-subtle bg-white/3">
      <button
        type="button"
        onClick={() => void copy(code)}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-fg-muted opacity-0 transition hover:bg-white/10 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
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
        <code>{code}</code>
      </pre>
    </div>
  );
}