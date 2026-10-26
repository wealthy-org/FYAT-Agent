import { env } from "@/lib/env";

const NETWORK_LABELS = {
  devnet: "Solana Devnet",
  localnet: "Solana Localnet",
} as const;

export function NetworkBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 py-1.5 text-xs text-fg-muted backdrop-blur-md">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      {NETWORK_LABELS[env.NEXT_PUBLIC_SOLANA_NETWORK]}
    </span>
  );
}