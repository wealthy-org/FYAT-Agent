import { NETWORK_NAME } from "@/lib/network";
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
        Rows marked PASS link to real {NETWORK_NAME} transactions.
      </p>
    </div>
  );
}
