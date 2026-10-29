import { ExternalLink } from "lucide-react";

import { formatAmount } from "@/features/builder/shared";
import { formatUtcDateTime } from "@/lib/format";
import { explorerTxUrl, shortenAddress } from "@/lib/solana";

import type { ReceiptDto } from "../types";
import { ReceiptStatusBadge } from "./receipts-status-badge";

const HEADERS = ["Session key", "Action", "Amount", "Policy", "Time", "Proof"];

export function ReceiptsTable({ items }: { items: readonly ReceiptDto[] }) {
  return (
    <div className="border-border-subtle bg-surface overflow-x-auto overscroll-x-contain rounded-2xl border backdrop-blur-md [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-190 text-left text-xs">
        <caption className="sr-only">
          Recent mandate execution receipts, newest first
        </caption>

        <thead>
          <tr className="border-border-subtle text-fg-subtle border-b">
            {HEADERS.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-5 py-4 font-medium tracking-[0.12em] uppercase"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={HEADERS.length}
                className="text-fg-muted px-5 py-8 text-center text-sm"
              >
                No receipts yet. New entries will appear automatically.
              </td>
            </tr>
          ) : (
            items.map((receipt) => (
              <tr
                key={receipt.id}
                className="border-border-subtle/60 border-b align-top last:border-b-0"
              >
                <td className="text-fg px-5 py-4 font-mono">
                  {shortenAddress(receipt.sessionPubkey)}
                </td>
                <td className="text-fg-muted px-5 py-4">{receipt.action}</td>
                <td className="text-fg px-5 py-4 font-mono tabular-nums">
                  {formatAmount(BigInt(receipt.amount))}
                </td>
                <td className="max-w-xs px-5 py-4">
                  <ReceiptStatusBadge status={receipt.status} />
                  {/* Teks biasa: `reason` berasal dari database, tidak pernah dirender sebagai HTML */}
                  {receipt.reason && (
                    <p className="text-fg-subtle mt-1.5">{receipt.reason}</p>
                  )}
                </td>
                <td className="text-fg-muted px-5 py-4 whitespace-nowrap">
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
                      className="text-brand-400 hover:text-brand-200 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span className="font-mono">
                        {shortenAddress(receipt.txSignature, 4)}
                      </span>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span
                      className="text-fg-subtle"
                      aria-label="No transaction"
                    >
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
