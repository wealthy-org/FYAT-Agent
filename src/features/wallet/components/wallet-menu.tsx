"use client";

import { Check, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { explorerAddressUrl, shortenAddress } from "@/lib/solana";

const COPIED_RESET_MS = 1500;

type WalletMenuProps = {
  address: string;
  onDisconnect: () => void;
};

export function WalletMenu({ address, onDisconnect }: WalletMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const menuId = useId();

  // Tutup saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(
        () => setCopied(false),
        COPIED_RESET_MS,
      );
    } catch {
    }
  };

    const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg";

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="md"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
      >
        <span className="size-2 rounded-full bg-success" aria-hidden="true" />
        <span className="font-mono">{shortenAddress(address)}</span>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </Button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border-subtle bg-canvas-deep p-1.5 shadow-glow"
        >
          <button type="button" onClick={handleCopy} className={itemClass}>
            {copied ? (
              <Check className="size-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            <span aria-live="polite">{copied ? "Copied" : "Copy address"}</span>
          </button>

          <a
            href={explorerAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View on Explorer
          </a>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
            className={itemClass}
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}