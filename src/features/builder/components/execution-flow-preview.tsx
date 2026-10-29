"use client";

import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

import { buildFlowSteps } from "../flow";
import type { AgentAttemptForm } from "../hooks/use-agent-attempt";
import { useExecuteTransfer } from "../hooks/use-execute-transfer";
import type { SimulationController } from "../hooks/use-simulation";
import type { MandateCreatorController } from "../mandate-creator-types";
import type { MandateConfig } from "../types";
import { AgentAttemptFields } from "./agent-attempt-fields";
import { ExecuteTransferSection } from "./execute-transfer-section";
import { FlowStepList } from "./flow-step-list";
import { MandateCreateSection } from "./mandate-create-section";
import { SessionVaultSection } from "./session-vault-section";
import { SimulationControls } from "./simulation-controls";

type ExecutionFlowPreviewProps = {
  config: MandateConfig | null;
  attemptForm: AgentAttemptForm;
  simulation: SimulationController;
  mandateCreator: MandateCreatorController;
};

export function ExecutionFlowPreview({
  config,
  attemptForm,
  simulation,
  mandateCreator,
}: ExecutionFlowPreviewProps) {
  const { attempt } = attemptForm;
  const { state, start, walletConnected } = simulation;

  const execution = useExecuteTransfer(mandateCreator.execute);

  const steps = useMemo(
    () => buildFlowSteps(config, attempt, state),
    [config, attempt, state],
  );

  const verifyStatus = steps.find((step) => step.id === "verify")?.status;
  const policyPassed = verifyStatus === "complete";
  const activeMandate = mandateCreator.activeMandate;

  const configMatchesMandate =
    !!config &&
    !!activeMandate &&
    config.action === "TRANSFER" &&
    config.recipient === activeMandate.recipient &&
    config.maxPerAction === activeMandate.maxPerAction &&
    config.maxTotal === activeMandate.maxTotal;

  const canExecute =
    walletConnected &&
    policyPassed &&
    state.status !== "running" &&
    !!attempt &&
    attempt.target === "ALLOWED" &&
    configMatchesMandate &&
    !!mandateCreator.sessionPubkey &&
    !mandateCreator.busy &&
    !mandateCreator.sessionBusy &&
    !execution.busy;

  function handleExecute() {
    if (!config || !attempt || !activeMandate || !canExecute) {
      return;
    }

    void execution.run(attempt.amount);
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>2 / Execution flow</Eyebrow>
          <h3 className="mt-2 font-display text-xl font-medium">
            Build {"\u2192"} Verify {"\u2192"} Simulate {"\u2192"} Execute
          </h3>
        </div>

        <div aria-live="polite" className="shrink-0">
          {policyPassed && (
            <span className="rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              PASS
            </span>
          )}

          {verifyStatus === "blocked" && (
            <span className="rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
              BLOCKED
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        Mode demo: session key disimpan di browser ini dan setiap eksekusi
        disetujui oleh owner. Ini belum agent otonom.
      </p>

      <AgentAttemptFields config={config} form={attemptForm} />

      <SimulationControls
        walletConnected={walletConnected}
        policyPassed={policyPassed}
        running={state.status === "running"}
        onRun={() => void start()}
      />

      <MandateCreateSection
        config={config}
        walletConnected={walletConnected}
        executeBusy={execution.busy}
        controller={mandateCreator}
      />

      <SessionVaultSection
        walletConnected={walletConnected}
        executeBusy={execution.busy}
        controller={mandateCreator}
      />

      <ExecuteTransferSection
        attemptAmount={attempt ? attempt.amount : null}
        activeMandate={activeMandate}
        configMatchesMandate={configMatchesMandate}
        policyPassed={policyPassed}
        canExecute={canExecute}
        busy={execution.busy}
        status={execution.status}
        error={execution.error}
        onExecute={handleExecute}
      />

      <FlowStepList steps={steps} />

      <p className="mt-8 border-t border-border-subtle pt-4 text-xs text-fg-subtle">
        Simulasi policy adalah preview lokal. Batas transfer yang sebenarnya
        tetap ditegakkan oleh program mandate on-chain.
      </p>
    </Card>
  );
}
