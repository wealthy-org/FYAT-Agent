import { ExternalLink } from "lucide-react";

import { formatAmount } from "@/features/builder/shared";
import { formatUtcDateTime } from "@/lib/format";
import { explorerTxUrl, shortenAddress } from "@/lib/solana";

import type { ReceiptDto } from "../types";
import { ReceiptStatusBadge } from "./receipts-status-badge";

const HEADERS = ["Session key", "Action", "Amount", "Policy", "Time", "Proof"];

export function ReceiptsTable({ items }: { items: readonly ReceiptDto[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface backdrop-blur-md">
      <table className="w-full min-w-190 text-left text-xs">
        <caption className="sr-only">
          Recent mandate execution receipts, newest first
        </caption>

        <thead>
          <tr className="border-b border-border-subtle text-fg-subtle">
            {HEADERS.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-5 py-4 font-medium uppercase tracking-[0.12em]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((receipt) => (
            <tr
              key={receipt.id}
              className="border-b border-border-subtle/60 align-top last:border-b-0"
            >
              <td className="px-5 py-4 font-mono text-fg">
                {shortenAddress(receipt.sessionPubkey)}
              </td>
              <td className="px-5 py-4 text-fg-muted">{receipt.action}</td>
              <td className="px-5 py-4 font-mono tabular-nums text-fg">
                {formatAmount(BigInt(receipt.amount))}
              </td>
              <td className="max-w-xs px-5 py-4">
                <ReceiptStatusBadge status={receipt.status} />
                {/* Teks biasa: `reason` berasal dari database, tidak pernah dirender sebagai HTML */}
                {receipt.reason && (
                  <p className="mt-1.5 text-fg-subtle">{receipt.reason}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-fg-muted">
                <time dateTime={receipt.createdAt}>
                  {formatUtcDateTime(receipt.createdAt)}
                </time>
              </td>
              <td className="px-5 py-4">
                {receipt.txSignature ? (
                  <a
                    href={explorerTxUrl(receipt.txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View transaction on Solana Explorer"
                    className="inline-flex items-center gap-1.5 text-brand-400 transition-colors hover:text-brand-200"
                  >
                    <span className="font-mono">
                      {shortenAddress(receipt.txSignature, 4)}
                    </span>
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-fg-subtle" aria-label="No transaction">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}