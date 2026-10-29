import type { ReceiptPageDto } from "../types";
import { ReceiptsFeed } from "./receipts-feed";

type ReceiptsPanelProps = {
  /** null = data tidak tersedia (misalnya database sedang bermasalah). */
  initial: ReceiptPageDto | null;
};

export function ReceiptsPanel({ initial }: ReceiptsPanelProps) {
  return (
    <div>
      <ReceiptsFeed initial={initial} />

      <p className="text-fg-subtle mt-6 text-xs">
        Devnet prototype: entries are recorded by a demo script until the
        mandate program ships. Rows marked PASS link to real Devnet
        transactions.
      </p>
    </div>
  );
}
