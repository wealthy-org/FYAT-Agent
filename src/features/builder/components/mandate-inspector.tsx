"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatUnits } from "@/lib/amount";
import { env } from "@/lib/env";
import { shortenAddress } from "@/lib/solana";

import { ASSET_SYMBOL, USDC_DECIMALS } from "../constants";
import { useMandateList, type InspectedMandateDto } from "../hooks/use-mandate-list";
import { useRevokeMandate } from "../hooks/use-revoke-mandate";

const STATUS_STYLE: Record<InspectedMandateDto["status"], string> = {
  ACTIVE: "border-success/40 bg-success/10 text-success",
  REVOKED: "border-danger/40 bg-danger/10 text-danger",
  EXPIRED: "border-border-subtle text-fg-muted",
  UNVERIFIED: "border-border-subtle text-fg-muted",
};

function explorerAccount(address: string): string {
  const cluster = env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

const units = (value: string) => `${formatUnits(BigInt(value), USDC_DECIMALS)} ${ASSET_SYMBOL}`;

export function MandateInspector() {
  const list = useMandateList();
  const revokeFlow = useRevokeMandate();

  async function handleRevoke(item: InspectedMandateDto) {
    const ok = await revokeFlow.revoke(item.id, item.mandatePda);
    if (ok) await list.refresh();
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Inspector</Eyebrow>
          <h3 className="mt-2 font-display text-xl font-medium">Mandate Saya</h3>
        </div>
        <Button disabled={!list.connected || list.refreshing || revokeFlow.busy} onClick={() => void list.refresh()}>
          {list.refreshing ? "Memuat..." : "Muat ulang"}
        </Button>
      </div>

      <p className="mt-2 text-sm text-fg-muted">
        Status dan pengeluaran dibaca langsung dari akun di chain.
      </p>

      {!list.connected && (
        <p className="mt-4 text-sm text-fg-muted">Hubungkan wallet untuk melihat mandate.</p>
      )}
      {list.error && (
        <p role="alert" className="mt-4 break-all text-sm text-danger">{list.error}</p>
      )}
      {list.connected && !list.error && list.items === null && (
        <p className="mt-4 text-sm text-fg-muted">Memuat...</p>
      )}
      {list.items?.length === 0 && (
        <p className="mt-4 text-sm text-fg-muted">Belum ada mandate onchain.</p>
      )}

      <ul className="mt-4 space-y-3">
        {list.items?.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border-subtle p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <a
                href={explorerAccount(item.mandatePda)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-400 underline"
              >
                #{item.onchainId} · {shortenAddress(item.mandatePda)}
              </a>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[item.status]}`}>
                {item.status === "UNVERIFIED" ? "TIDAK TERVERIFIKASI" : item.status}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <dt className="text-fg-muted">Terpakai</dt>
              <dd className="text-right">{units(item.spent)} / {units(item.maxTotal)}</dd>
              <dt className="text-fg-muted">Maks per aksi</dt>
              <dd className="text-right">{units(item.maxPerAction)}</dd>
              <dt className="text-fg-muted">Penerima</dt>
              <dd className="text-right">{shortenAddress(item.recipient)}</dd>
              <dt className="text-fg-muted">Session</dt>
              <dd className="text-right">{shortenAddress(item.sessionPubkey)}</dd>
              <dt className="text-fg-muted">Kedaluwarsa</dt>
              <dd className="text-right">{new Date(item.expiresAt).toLocaleString()}</dd>
              {item.revokedAt && (
                <>
                  <dt className="text-fg-muted">Dicabut</dt>
                  <dd className="text-right">{new Date(item.revokedAt).toLocaleString()}</dd>
                </>
              )}
            </dl>

            {!item.chainVerified && (
              <p className="mt-3 text-xs text-fg-subtle">
                Akun tidak terbaca di chain. Nilai di atas dari database.
              </p>
            )}
            {item.chainVerified && !item.dbInSync && (
              <p className="mt-3 text-xs text-fg-subtle">
                Database belum sama dengan chain (eksekusi atau pencabutan belum
                tercatat). Chain yang berlaku.
              </p>
            )}

            {item.status === "ACTIVE" && (
              <Button
                className="mt-3 w-full"
                disabled={revokeFlow.busy}
                onClick={() => void handleRevoke(item)}
              >
                {revokeFlow.busy ? "Mencabut..." : "Cabut Mandate"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {revokeFlow.status && (
        <p aria-live="polite" className="mt-3 break-all text-sm text-fg-muted">{revokeFlow.status}</p>
      )}
      {revokeFlow.error && (
        <p role="alert" className="mt-3 break-all text-sm text-danger">{revokeFlow.error}</p>
      )}
    </Card>
  );
}