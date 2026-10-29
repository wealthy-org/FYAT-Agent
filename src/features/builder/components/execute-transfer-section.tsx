"use client";

import { Button } from "@/components/ui/button";
import { USDC_DECIMALS } from "@/features/builder/constants";

import type { ActiveMandate } from "../mandate-creator-types";

type ExecuteTransferSectionProps = {
  attemptAmount: bigint | null;
  activeMandate: ActiveMandate | null;
  configMatchesMandate: boolean;
  policyPassed: boolean;
  canExecute: boolean;
  busy: boolean;
  status: string;
  error: string;
  onExecute: () => void;
};

export function ExecuteTransferSection({
  attemptAmount,
  activeMandate,
  configMatchesMandate,
  policyPassed,
  canExecute,
  busy,
  status,
  error,
  onExecute,
}: ExecuteTransferSectionProps) {
  const isSwap = activeMandate?.action === "SWAP";

  return (
    <section className="mt-6 rounded-2xl border border-border-subtle p-4">
      <h4 className="font-medium">{isSwap ? "Execute Swap" : "Execute Transfer"}</h4>

      <p className="mt-1 text-sm text-fg-muted">
        {isSwap
          ? "Swap real tokens from the vault through the approved Meteora DAMM pool. Review the amount, pool, network, and balance before continuing."
          : "Send real tokens from the vault to the recipient recorded in the mandate. Make sure the amount, recipient, network, and balance are correct."}
      </p>

      {attemptAmount !== null && (
        <div className="mt-3 space-y-1 text-sm">
          <p>
            Attempt amount:{" "}
            <span className="font-medium">
              {(Number(attemptAmount) / 10 ** USDC_DECIMALS).toLocaleString(
                "en-US",
                { maximumFractionDigits: USDC_DECIMALS },
              )}{" "}
              token
            </span>
          </p>

          <p className="break-all text-fg-muted">
            {isSwap ? "Approved pool: " : "Mandate recipient: "}
            {activeMandate?.recipient ?? "Not available"}
          </p>
        </div>
      )}

      {!activeMandate && (
        <p className="mt-3 text-sm text-fg-muted">
          Create a mandate or restore a session first.
        </p>
      )}

      {activeMandate && !configMatchesMandate && (
        <p className="mt-3 text-sm text-danger">
          The current configuration differs from the active mandate. Use the
          same recipient and limits as that mandate.
        </p>
      )}

      {!policyPassed && (
        <p className="mt-3 text-sm text-fg-muted">
          Run the simulation and make sure the policy check passes before
          executing this action.
        </p>
      )}

      <Button className="mt-4 w-full" disabled={!canExecute} onClick={onExecute}>
        {busy
          ? isSwap
            ? "Executing swap..."
            : "Executing transfer..."
          : isSwap
            ? "Execute Swap"
            : "Execute Transfer"}
      </Button>

      {status && (
        <p aria-live="polite" className="mt-3 break-all text-sm text-fg-muted">
          {status}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 break-all text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
