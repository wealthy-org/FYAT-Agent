import { Card } from "@/components/ui/card";

import type { ReceiptPageDto } from "../types";
import { ReceiptsFeed } from "./receipts-feed";

type ReceiptsPanelProps = {
  /** null = data tidak tersedia (misalnya database sedang bermasalah). */
  initial: ReceiptPageDto | null;
};

export function ReceiptsPanel({ initial }: ReceiptsPanelProps) {
  return (
    <div>
      {initial === null ? (
        <Card className="text-center text-sm text-fg-muted">
          Receipts are temporarily unavailable. Please check back soon.
        </Card>
      ) : initial.items.length === 0 ? (
        <Card className="text-center text-sm text-fg-muted">
          No receipts yet. Run <code className="font-mono">pnpm db:seed</code>{" "}
          to record a demo set.
        </Card>
      ) : (
        <ReceiptsFeed initial={initial} />
      )}

      <p className="mt-6 text-xs text-fg-subtle">
        Devnet prototype: entries are recorded by a demo script until the
        mandate program ships. Rows marked PASS link to real Devnet
        transactions.
      </p>
    </div>
  );
}