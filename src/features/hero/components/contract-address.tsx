"use client";

import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/cn";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/** Contract address token FYAT. Hanya tampilan; tidak dipakai logika app. */
export const TOKEN_CA = "Hvnpj6yCGXfBcWhWbf9bxTm64G5yiCvuqz73ervLpump";

export function ContractAddress({ className }: { className?: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => void copy(TOKEN_CA)}
      aria-label={copied ? "Contract address copied" : "Copy contract address"}
      title="Copy contract address"
      className={cn(
        "group border-border-subtle bg-surface pointer-events-auto inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left backdrop-blur-md transition-colors",
        "hover:border-border-strong hover:bg-surface-raised",
        "focus-visible:outline-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      <span className="bg-brand-500/20 text-brand-200 shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide">
        CA
      </span>
      <span className="text-fg-muted group-hover:text-fg min-w-0 truncate font-mono text-[11px] sm:text-xs">
        {TOKEN_CA}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
          copied ? "text-success" : "text-fg-subtle group-hover:text-fg",
        )}
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
