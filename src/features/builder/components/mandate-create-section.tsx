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
      <h4 className="font-medium">Buat Mandate On-chain</h4>

      <p className="text-fg-muted mt-1 text-sm">
        Membuat mandate on-chain memerlukan persetujuan wallet. Langkah ini
        belum mengirim token.
      </p>

      <label htmlFor="agent-pubkey" className="mt-4 block text-sm font-medium">
        Session public key agent (opsional)
      </label>
      <input
        id="agent-pubkey"
        type="text"
        value={agentKey}
        onChange={(event) => setAgentKey(event.target.value)}
        placeholder="Dari pnpm agent:keygen"
        autoComplete="off"
        spellCheck={false}
        maxLength={64}
        className="border-border-subtle focus:border-brand-400 mt-2 w-full rounded-xl border bg-transparent px-3 py-2 font-mono text-sm outline-none"
      />
      <p className="text-fg-subtle mt-1 text-xs">
        Kosongkan untuk mode demo (kunci dibuat di browser ini). Isi agar agent
        memegang kuncinya sendiri dan owner tidak ikut menandatangani eksekusi.
      </p>

      <Button
        className="mt-4 w-full"
        disabled={
          !walletConnected ||
          !config ||
          config.action !== "TRANSFER" ||
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
        {controller.busy ? "Memproses transaksi..." : "Buat Mandate On-chain"}
      </Button>

      {activeMandate && (
        <div className="border-border-subtle mt-4 space-y-2 rounded-xl border p-3 text-sm">
          <p className="font-medium">Mandate aktif</p>

          <p className="text-fg-muted">ID aplikasi</p>
          <p className="break-all">{activeMandate.id}</p>

          <p className="text-fg-muted">Mandate PDA</p>
          <p className="break-all">{activeMandate.mandatePda}</p>

          {controller.externalAgent ? (
            <>
              <p className="text-fg-muted">Session key dipegang agent</p>
              <p className="break-all">{controller.externalAgent}</p>
              <p className="text-fg-subtle text-xs">
                Eksekusi dijalankan agent, bukan dari halaman ini:
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
              Lihat transaksi di Solana Explorer
            </a>
          )}
        </div>
      )}
    </section>
  );
}
