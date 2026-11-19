import { cn } from "@/lib/cn";
import { IS_MAINNET, NETWORK_LABELS, NETWORK } from "@/lib/network";

export function NetworkBadge() {
  const dot = IS_MAINNET ? "bg-success" : "bg-warning";
  return (
    <span className="border-border-subtle bg-surface text-fg-muted inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs backdrop-blur-md">
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none",
            dot,
          )}
        />
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      {NETWORK_LABELS[NETWORK]}
    </span>
  );
}
