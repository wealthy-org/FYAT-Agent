import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";

type SimulationControlsProps = {
  action: "TRANSFER" | "SWAP" | null;
  walletConnected: boolean;
  /** Hasil Verify: hanya attempt yang lolos mandate yang boleh disimulasikan. */
  policyPassed: boolean;
  running: boolean;
  onRun: () => void;
};

function disabledReason(
  walletConnected: boolean,
  policyPassed: boolean,
): string | null {
  if (!walletConnected) return "Connect a wallet to run a simulation.";
  if (!policyPassed) return "Only attempts that pass the mandate are simulated.";
  return null;
}

export function SimulationControls({
  action,
  walletConnected,
  policyPassed,
  running,
  onRun,
}: SimulationControlsProps) {
  const reason = disabledReason(walletConnected, policyPassed);

  return (
    <div className="mt-6">
      <Button
        variant="secondary"
        size="sm"
        onClick={onRun}
        disabled={reason !== null || running}
      >
        <Play className="size-3.5" aria-hidden="true" />
        {running ? "Simulating…" : "Run simulation"}
      </Button>

      <p className="mt-2 text-xs text-fg-subtle">
        {reason ??
          (action === "SWAP"
            ? "Dry-run only: simulates the approved Meteora DAMM swap from the vault. Nothing is signed or sent."
            : "Dry-run only: simulates a plain token transfer from your wallet. Nothing is signed or sent.")}
      </p>
    </div>
  );
}