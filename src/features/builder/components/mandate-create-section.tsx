"use client";

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

  return (
    <section className="mt-6 rounded-2xl border border-border-subtle p-4">
      <h4 className="font-medium">Buat Mandate On-chain</h4>

      <p className="mt-1 text-sm text-fg-muted">
        Membuat mandate on-chain memerlukan persetujuan wallet. Langkah ini
        belum mengirim token.
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
            void controller.create(config).catch(() => undefined);
          }
        }}
      >
        {controller.busy ? "Memproses transaksi..." : "Buat Mandate On-chain"}
      </Button>

      {activeMandate && (
        <div className="mt-4 space-y-2 rounded-xl border border-border-subtle p-3 text-sm">
          <p className="font-medium">Mandate aktif</p>

          <p className="text-fg-muted">ID aplikasi</p>
          <p className="break-all">{activeMandate.id}</p>

          <p className="text-fg-muted">Mandate PDA</p>
          <p className="break-all">{activeMandate.mandatePda}</p>

          <p className="text-fg-muted">Session public key</p>
          <p className="break-all">{controller.sessionPubkey}</p>
        </div>
      )}

      {controller.status && (
        <p aria-live="polite" className="mt-3 break-all text-sm text-fg-muted">
          {controller.status}
        </p>
      )}

      {controller.error && (
        <p role="alert" className="mt-3 break-all text-sm text-danger">
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
