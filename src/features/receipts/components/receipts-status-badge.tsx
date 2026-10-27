import { cn } from "@/lib/cn";

import type { ReceiptDto } from "../types";

const STATUS_STYLES = {
  SUCCESS: {
    label: "PASS",
    className: "border-success/40 bg-success/10 text-success",
  },
  REJECTED_BY_POLICY: {
    label: "BLOCKED",
    className: "border-danger/40 bg-danger/10 text-danger",
  },
  FAILED_SIMULATION: {
    label: "SIM FAILED",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
} as const satisfies Record<
  ReceiptDto["status"],
  { label: string; className: string }
>;

export function ReceiptStatusBadge({ status }: { status: ReceiptDto["status"] }) {
  const { label, className } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}