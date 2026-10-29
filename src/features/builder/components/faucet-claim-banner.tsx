"use client";

import { Droplets, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { explorerTxUrl } from "@/lib/solana";

import { useFaucetClaim } from "../hooks/use-faucet-claim";

export function FaucetClaimBanner({ onClaimed }: { onClaimed: () => void }) {
  const faucet = useFaucetClaim(onClaimed);

  return (
    <section
      aria-labelledby="faucet-title"
      className="border-success/25 bg-success/5 grid gap-4 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="border-success/25 bg-success/10 text-success flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <Droplets aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="faucet-title" className="font-medium">
            Need Devnet test funds?
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            Claim free SOL for fees and test USDC for your vault. One claim per
            wallet every 24 hours. A message signature verifies wallet
            ownership; the claim does not require an on-chain approval.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <Button
          variant="secondary"
          className="border-success/30 text-success hover:border-success/50 hover:bg-success/10"
          disabled={
            !faucet.walletConnected ||
            !faucet.supportsMessageSigning ||
            faucet.busy
          }
          onClick={() => void faucet.claim()}
        >
          <Droplets aria-hidden="true" className="size-4" />
          {faucet.busy
            ? "Claiming..."
            : !faucet.walletConnected
              ? "Connect wallet to claim"
              : faucet.supportsMessageSigning
                ? "Claim Devnet funds"
                : "Use a signing-enabled wallet"}
        </Button>
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fg-subtle decoration-border-strong hover:text-fg inline-flex items-center gap-1 text-xs underline underline-offset-4"
        >
          Official SOL faucet
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
      </div>

      {faucet.status && (
        <p
          aria-live="polite"
          className="text-success text-sm break-all sm:col-span-2"
        >
          {faucet.status}
          {faucet.result && (
            <>
              {" "}
              <a
                href={explorerTxUrl(faucet.result.signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                View transaction
              </a>
            </>
          )}
        </p>
      )}
      {faucet.error && (
        <p
          role="alert"
          className="text-danger text-sm break-words sm:col-span-2"
        >
          {faucet.error}
        </p>
      )}
    </section>
  );
}
