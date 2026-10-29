"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatUnits } from "@/lib/amount";
import { env } from "@/lib/env";
import { shortenAddress } from "@/lib/solana";

import { ASSET_SYMBOL, USDC_DECIMALS } from "../constants";
import {
  useMandateList,
  type InspectedMandateDto,
} from "../hooks/use-mandate-list";
import { useRevokeMandate } from "../hooks/use-revoke-mandate";

const STATUS_STYLE: Record<InspectedMandateDto["status"], string> = {
  ACTIVE: "border-success/40 bg-success/10 text-success",
  REVOKED: "border-danger/40 bg-danger/10 text-danger",
  EXPIRED: "border-border-subtle text-fg-muted",
  UNVERIFIED: "border-border-subtle text-fg-muted",
};

function explorerAccount(address: string): string {
  const cluster =
    env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

const units = (value: string) =>
  `${formatUnits(BigInt(value), USDC_DECIMALS)} ${ASSET_SYMBOL}`;

export function MandateInspector() {
  const list = useMandateList();
  const revokeFlow = useRevokeMandate();

  async function handleRevoke(item: InspectedMandateDto) {
    const ok = await revokeFlow.revoke(item.id, item.mandatePda);
    if (ok) await list.refresh();
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-3 min-[400px]:flex-row min-[400px]:items-center">
        <div>
          <Eyebrow>Inspector</Eyebrow>
          <h3 className="font-display mt-2 text-xl font-medium">My Mandates</h3>
        </div>
        <Button
          disabled={!list.connected || list.refreshing || revokeFlow.busy}
          onClick={() => void list.refresh()}
        >
          {list.refreshing ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <p className="text-fg-muted mt-2 text-sm">
        Status and spending are read directly from the on-chain account.
      </p>

      {!list.connected && (
        <p className="text-fg-muted mt-4 text-sm">
          Connect your wallet to view your mandates.
        </p>
      )}
      {list.error && (
        <p role="alert" className="text-danger mt-4 text-sm break-all">
          {list.error}
        </p>
      )}
      {list.connected && !list.error && list.items === null && (
        <p className="text-fg-muted mt-4 text-sm">Loading...</p>
      )}
      {list.items?.length === 0 && (
        <p className="text-fg-muted mt-4 text-sm">No on-chain mandates yet.</p>
      )}

      <ul className="mt-4 space-y-3">
        {list.items?.map((item) => (
          <li
            key={item.id}
            className="border-border-subtle rounded-2xl border p-4 text-sm"
          >
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-fg block font-medium">
                    #{item.onchainId} · {item.action}
                  </span>
                  <span className="text-fg-subtle mt-1 block font-mono text-xs">
                    {shortenAddress(item.mandatePda)}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[item.status]}`}
                >
                  {item.status}
                </span>
              </summary>

              <div className="border-border-subtle mt-3 border-t pt-3">
                <a
                  href={explorerAccount(item.mandatePda)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 text-xs underline"
                >
                  View mandate on Solana Explorer
                </a>

                <dl                 className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-xs sm:text-sm">
                  <dt className="text-fg-muted">Spent</dt>
                  <dd className="min-w-0 break-words text-right">
                    {units(item.spent)} / {units(item.maxTotal)}
                  </dd>
                  <dt className="text-fg-muted">Action</dt>
                  <dd className="min-w-0 break-words text-right">{item.action}</dd>
                  <dt className="text-fg-muted">Max per action</dt>
                  <dd className="min-w-0 break-words text-right">{units(item.maxPerAction)}</dd>
                  <dt className="text-fg-muted">
                    {item.action === "SWAP" ? "Approved pool" : "Recipient"}
                  </dt>
                  <dd className="min-w-0 break-all text-right">
                    {shortenAddress(item.recipient)}
                  </dd>
                  <dt className="text-fg-muted">Session</dt>
                  <dd className="min-w-0 break-all text-right">
                    {shortenAddress(item.sessionPubkey)}
                  </dd>
                  <dt className="text-fg-muted">Expires</dt>
                  <dd className="min-w-0 break-words text-right">
                    {new Date(item.expiresAt).toLocaleString()}
                  </dd>
                  {item.revokedAt && (
                    <>
                      <dt className="text-fg-muted">Revoked</dt>
                      <dd className="min-w-0 break-words text-right">
                        {new Date(item.revokedAt).toLocaleString()}
                      </dd>
                    </>
                  )}
                </dl>

                {!item.chainVerified && (
                  <p className="text-fg-subtle mt-3 text-xs">
                    The account could not be read on-chain. Values above are
                    from the database.
                  </p>
                )}
                {item.chainVerified && !item.dbInSync && (
                  <p className="text-fg-subtle mt-3 text-xs">
                    The database is out of sync with the chain (the execution or
                    revocation has not been recorded). The chain is
                    authoritative.
                  </p>
                )}

                {item.status === "ACTIVE" && (
                  <Button
                    className="mt-3 w-full"
                    disabled={revokeFlow.busy}
                    onClick={() => void handleRevoke(item)}
                  >
                    {revokeFlow.busy ? "Revoking..." : "Revoke Mandate"}
                  </Button>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {revokeFlow.status && (
        <p aria-live="polite" className="text-fg-muted mt-3 text-sm break-all">
          {revokeFlow.status}
        </p>
      )}
      {revokeFlow.error && (
        <p role="alert" className="text-danger mt-3 text-sm break-all">
          {revokeFlow.error}
        </p>
      )}
    </Card>
  );
}
