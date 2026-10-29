"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

import type { MandateCreatorController } from "../mandate-creator-types";
import type { MandateConfig } from "../types";

type MandateCreateSectionProps = {
  config: MandateConfig | null;
  walletConnected: boolean;
  executeBusy: boolean;
  controller: MandateCreatorController;
};

export function MandateCreateSection({
  config,
  walletConnected,
  executeBusy,
  controller,
}: MandateCreateSectionProps) {
  const activeMandate = controller.activeMandate;
  const [agentKey, setAgentKey] = useState("");

  return (
    <section className="border-border-subtle mt-6 rounded-2xl border p-4">
      <h4 className="font-medium">Create On-chain Mandate</h4>

      <p className="text-fg-muted mt-1 text-sm">
        Creating an on-chain mandate requires wallet approval. This step does
        not transfer any tokens.
      </p>

      <label htmlFor="agent-pubkey" className="mt-4 block text-sm font-medium">
        Agent session public key (optional)
      </label>
      <input
        id="agent-pubkey"
        type="text"
        value={agentKey}
        onChange={(event) => setAgentKey(event.target.value)}
        placeholder="Paste the public key from pnpm agent:keygen"
        autoComplete="off"
        spellCheck={false}
        maxLength={64}
        className="border-border-subtle focus:border-brand-400 mt-2 w-full rounded-xl border bg-transparent px-3 py-2 font-mono text-sm outline-none"
      />
      <p className="text-fg-subtle mt-1 text-xs">
        Leave blank for demo mode (a key will be generated in this browser).
        Enter a key so the agent holds it and the owner does not sign executions.
      </p>

      <Button
        className="mt-4 w-full"
        disabled={
          !walletConnected ||
          !config ||
          controller.busy ||
          controller.sessionBusy ||
          executeBusy
        }
        onClick={() => {
          if (config) {
            void controller
              .create(config, agentKey.trim() || undefined)
              .catch(() => undefined);
          }
        }}
      >
        {controller.busy ? "Processing transaction..." : "Create On-chain Mandate"}
      </Button>

      {activeMandate && (
        <div className="border-border-subtle mt-4 space-y-2 rounded-xl border p-3 text-sm">
          <p className="font-medium">Active mandate</p>

          <p className="text-fg-muted">App ID</p>
          <p className="break-all">{activeMandate.id}</p>

          <p className="text-fg-muted">Mandate PDA</p>
          <p className="break-all">{activeMandate.mandatePda}</p>

          {controller.externalAgent ? (
            <>
              <p className="text-fg-muted">Session key held by agent</p>
              <p className="break-all">{controller.externalAgent}</p>
              <p className="text-fg-subtle text-xs">
                The agent executes this, not this page:
              </p>
              <p className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs break-all">
                pnpm agent:run --mandate {activeMandate.mandatePda} --amount 3
              </p>
            </>
          ) : (
            <>
              <p className="text-fg-muted">Session public key</p>
              <p className="break-all">{controller.sessionPubkey}</p>
            </>
          )}
        </div>
      )}

      {controller.status && (
        <p aria-live="polite" className="text-fg-muted mt-3 text-sm break-all">
          {controller.status}
        </p>
      )}

      {controller.error && (
        <p role="alert" className="text-danger mt-3 text-sm break-all">
          {controller.error}
        </p>
      )}

      {controller.signature && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="break-all">Signature: {controller.signature}</p>

          {env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" && (
            <a
              className="text-brand-400 underline"
              href={`https://explorer.solana.com/tx/${controller.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View transaction in Solana Explorer
            </a>
          )}
        </div>
      )}
    </section>
  );
}
