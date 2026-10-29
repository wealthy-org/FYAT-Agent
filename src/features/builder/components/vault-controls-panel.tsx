"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatUnits } from "@/lib/amount";
import { env } from "@/lib/env";

import { ASSET_SYMBOL, USDC_DECIMALS } from "../constants";
import { useRevokeMandate } from "../hooks/use-revoke-mandate";
import { useVaultFunds } from "../hooks/use-vault-funds";

type PanelMandate = {
  id: string;
  mandatePda: string;
};

type VaultControlsPanelProps = {
  /** Mandate aktif dari useCreateMandate (null bila belum ada). */
  activeMandate: PanelMandate | null;
};

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-border-subtle bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400";

function explorerTx(signature: string): string {
  const cluster = env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function VaultControlsPanel({ activeMandate }: VaultControlsPanelProps) {
  const funds = useVaultFunds();
  const revokeFlow = useRevokeMandate();

  const [amount, setAmount] = useState("");
    // Menyimpan ID mandate yang sudah dicabut. Status "dicabut" diturunkan saat
  // render, jadi berganti mandate otomatis tidak lagi dianggap dicabut.
  const [revokedId, setRevokedId] = useState<string | null>(null);
  const revoked = activeMandate !== null && revokedId === activeMandate.id;

  const { refreshBalances } = funds;
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refreshBalances();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshBalances]);

  const anyBusy = funds.busy || revokeFlow.busy;
  const amountEmpty = amount.trim().length === 0;

    async function handleRevoke() {
    if (!activeMandate) return;
    const ok = await revokeFlow.revoke(activeMandate.id, activeMandate.mandatePda);
    if (ok) setRevokedId(activeMandate.id);
  }

  return (
    <Card className="p-6 md:p-8">
      <Eyebrow>Vault</Eyebrow>
      <h3 className="mt-2 font-display text-xl font-medium">Dana &amp; Akses</h3>

      {/* ------------------------------ Saldo ------------------------------ */}
      <section className="mt-6 rounded-2xl border border-border-subtle p-4">
        <h4 className="font-medium">Saldo</h4>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-fg-muted">Vault</dt>
            <dd className="font-medium">
              {funds.balances
                ? `${formatUnits(funds.balances.vault, USDC_DECIMALS)} ${ASSET_SYMBOL}`
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Wallet</dt>
            <dd className="font-medium">
              {funds.balances
                ? `${formatUnits(funds.balances.wallet, USDC_DECIMALS)} ${ASSET_SYMBOL}`
                : "-"}
            </dd>
          </div>
        </dl>
        <Button
          className="mt-3 w-full"
          disabled={anyBusy}
          onClick={() => void funds.refreshBalances()}
        >
          Muat ulang saldo
        </Button>
      </section>

      {/* ------------------------ Deposit & Withdraw ----------------------- */}
      <section className="mt-6 rounded-2xl border border-border-subtle p-4">
        <h4 className="font-medium">Setor &amp; Tarik</h4>
        <p className="mt-1 text-sm text-fg-muted">
          Hanya owner yang dapat menyetor dan menarik. Penarikan selalu ke token
          account milik owner sendiri.
        </p>

        <label htmlFor="vault-amount" className="mt-4 block text-sm font-medium">
          Jumlah ({ASSET_SYMBOL})
        </label>
        <input
          id="vault-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="mis. 5 atau 2.5"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={INPUT_CLASS}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            disabled={anyBusy || amountEmpty}
            onClick={() => void funds.deposit(amount)}
          >
            {funds.busy ? "Memproses..." : "Setor"}
          </Button>
          <Button
            disabled={anyBusy || amountEmpty}
            onClick={() => void funds.withdraw(amount)}
          >
            {funds.busy ? "Memproses..." : "Tarik"}
          </Button>
        </div>

        {funds.status && (
          <p aria-live="polite" className="mt-3 break-all text-sm text-fg-muted">
            {funds.status}
          </p>
        )}
        {funds.error && (
          <p role="alert" className="mt-3 break-all text-sm text-danger">
            {funds.error}
          </p>
        )}
        {funds.signature && (
          <a
            href={explorerTx(funds.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-brand-400 underline"
          >
            Lihat di Explorer
          </a>
        )}
      </section>

      {/* ------------------------------ Revoke ----------------------------- */}
      <section className="mt-6 rounded-2xl border border-border-subtle p-4">
        <h4 className="font-medium">Cabut Mandate</h4>
        <p className="mt-1 text-sm text-fg-muted">
          Setelah dicabut, setiap transaksi agent langsung ditolak program
          (MandateIsRevoked). Pencabutan tidak bisa dibatalkan.
        </p>

        {activeMandate ? (
          <p className="mt-3 break-all text-xs text-fg-subtle">
            Mandate: {activeMandate.mandatePda}
          </p>
        ) : (
          <p className="mt-3 text-sm text-fg-muted">
            Belum ada mandate aktif. Buat atau pulihkan mandate dulu.
          </p>
        )}

        <Button
          className="mt-3 w-full"
          disabled={!activeMandate || revoked || anyBusy}
          onClick={() => void handleRevoke()}
        >
          {revokeFlow.busy
            ? "Mencabut..."
            : revoked
              ? "Mandate sudah dicabut"
              : "Cabut Mandate"}
        </Button>

        {revokeFlow.status && (
          <p aria-live="polite" className="mt-3 break-all text-sm text-fg-muted">
            {revokeFlow.status}
          </p>
        )}
        {revokeFlow.error && (
          <p role="alert" className="mt-3 break-all text-sm text-danger">
            {revokeFlow.error}
          </p>
        )}
        {revokeFlow.signature && (
          <a
            href={explorerTx(revokeFlow.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-brand-400 underline"
          >
            Lihat di Explorer
          </a>
        )}
      </section>
    </Card>
  );
}