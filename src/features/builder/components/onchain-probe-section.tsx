"use client";

import { Button } from "@/components/ui/button";

import type { OnchainProbeState } from "../hooks/use-onchain-probe";

type OnchainProbeSectionProps = {
  state: OnchainProbeState;
  ready: boolean;
  onRun: () => void;
};

export function OnchainProbeSection({
  state,
  ready,
  onRun,
}: OnchainProbeSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border border-border-subtle p-4">
      <h4 className="font-medium">Test directly against the on-chain program</h4>
      <p className="mt-1 text-sm text-fg-muted">
        Send the attempt above directly to the mandate program without UI
        filtering, using a simulation (no fee or signature required). Any
        rejection shown comes from the program.
      </p>

      <Button
        className="mt-4 w-full"
        disabled={!ready || state.status === "running"}
        onClick={onRun}
      >
        {state.status === "running" ? "Testing..." : "Test against program"}
      </Button>

      {!ready && (
        <p className="mt-3 text-sm text-fg-muted">
          Connect your wallet and create or restore a mandate first.
        </p>
      )}

      {state.status === "done" && (
        <p
          role="status"
          className={`mt-3 break-all text-sm ${
            state.result.accepted ? "text-success" : "text-danger"
          }`}
        >
          {state.result.accepted
            ? "The program ACCEPTED this attempt."
            : `The program REJECTED it: ${state.result.programError ?? "other error; see logs"}`}
        </p>
      )}

      {state.status === "done" && state.result.logs.length > 0 && (
        <pre className="mt-2 max-h-40 overflow-auto text-xs text-fg-subtle">
          {state.result.logs.join("\n")}
        </pre>
      )}

      {state.status === "error" && (
        <p role="alert" className="mt-3 break-all text-sm text-danger">
          {state.message}
        </p>
      )}
    </section>
  );
}