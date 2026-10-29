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
  balanceRefreshKey?: number;
};

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-border-subtle bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400";

function explorerTx(signature: string): string {
  const cluster =
    env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function VaultControlsPanel({
  activeMandate,
  balanceRefreshKey = 0,
}: VaultControlsPanelProps) {
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
  }, [activeMandate?.id, balanceRefreshKey, refreshBalances]);

  const anyBusy = funds.busy || revokeFlow.busy;
  const amountEmpty = amount.trim().length === 0;

  async function handleRevoke() {
    if (!activeMandate) return;
    const ok = await revokeFlow.revoke(
      activeMandate.id,
      activeMandate.mandatePda,
    );
    if (ok) setRevokedId(activeMandate.id);
  }

  return (
    <Card id="playground-funds" className="scroll-mt-24 p-5 md:p-6">
      <Eyebrow>Step 1 / Funds</Eyebrow>
      <h3 className="font-display mt-2 text-xl font-medium">
        Funds &amp; Access
      </h3>
      <p className="text-fg-muted mt-1 text-sm">
        Claim test USDC above, then create a mandate to initialize your vault.
        Deposit into it before executing.
      </p>

      {/* ------------------------------ Balance ------------------------------ */}
      <section className="border-border-subtle mt-6 rounded-2xl border p-4">
        <h4 className="font-medium">Balance</h4>
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
          Refresh balance
        </Button>
      </section>

      {/* ------------------------ Deposit & Withdraw ----------------------- */}
      <section className="border-border-subtle mt-6 rounded-2xl border p-4">
        <h4 className="font-medium">Deposit &amp; Withdraw</h4>
        <p className="text-fg-muted mt-1 text-sm">
          Only the owner can deposit and withdraw. Withdrawals always go to the
          owners own token account.
        </p>

        <label
          htmlFor="vault-amount"
          className="mt-4 block text-sm font-medium"
        >
          Amount ({ASSET_SYMBOL})
        </label>
        <input
          id="vault-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 5 or 2.5"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={INPUT_CLASS}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            disabled={anyBusy || amountEmpty}
            onClick={() => void funds.deposit(amount)}
          >
            {funds.busy ? "Processing..." : "Deposit"}
          </Button>
          <Button
            disabled={anyBusy || amountEmpty}
            onClick={() => void funds.withdraw(amount)}
          >
            {funds.busy ? "Processing..." : "Withdraw"}
          </Button>
        </div>

        {funds.status && (
          <p
            aria-live="polite"
            className="text-fg-muted mt-3 text-sm break-all"
          >
            {funds.status}
          </p>
        )}
        {funds.error && (
          <p role="alert" className="text-danger mt-3 text-sm break-all">
            {funds.error}
          </p>
        )}
        {funds.signature && (
          <a
            href={explorerTx(funds.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 mt-2 inline-block text-sm underline"
          >
            View in Explorer
          </a>
        )}
      </section>

      {/* ------------------------------ Revoke ----------------------------- */}
      <details className="border-border-subtle mt-5 rounded-2xl border p-4">
        <summary className="cursor-pointer list-none font-medium marker:hidden">
          <span className="flex items-center justify-between gap-3">
            <span>Revoke mandate</span>
            <span aria-hidden="true" className="text-fg-subtle">
              +
            </span>
          </span>
        </summary>
        <div className="pt-3">
          <h4 className="font-medium">Revoke Mandate</h4>
          <p className="text-fg-muted mt-1 text-sm">
            Once revoked, every agent transaction is immediately rejected by the
            program (MandateIsRevoked). Revocation cannot be undone.
          </p>

          {activeMandate ? (
            <p className="text-fg-subtle mt-3 text-xs break-all">
              Mandate: {activeMandate.mandatePda}
            </p>
          ) : (
            <p className="text-fg-muted mt-3 text-sm">
              No active mandate yet. Create or restore one first.
            </p>
          )}

          <Button
            className="mt-3 w-full"
            disabled={!activeMandate || revoked || anyBusy}
            onClick={() => void handleRevoke()}
          >
            {revokeFlow.busy
              ? "Revoking..."
              : revoked
                ? "Mandate revoked"
                : "Revoke Mandate"}
          </Button>

          {revokeFlow.status && (
            <p
              aria-live="polite"
              className="text-fg-muted mt-3 text-sm break-all"
            >
              {revokeFlow.status}
            </p>
          )}
          {revokeFlow.error && (
            <p role="alert" className="text-danger mt-3 text-sm break-all">
              {revokeFlow.error}
            </p>
          )}
          {revokeFlow.signature && (
            <a
              href={explorerTx(revokeFlow.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 mt-2 inline-block text-sm underline"
            >
              View in Explorer
            </a>
          )}
        </div>
      </details>
    </Card>
  );
}
