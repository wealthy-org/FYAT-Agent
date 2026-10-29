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
import { useOnchainProbe } from "../hooks/use-onchain-probe";
import { OnchainProbeSection } from "./onchain-probe-section";
import { getSwapConfig } from "@/lib/swap-config";
import { env } from "@/lib/env";

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

  const probe = useOnchainProbe(mandateCreator);

  const steps = useMemo(
    () => buildFlowSteps(config, attempt, state, execution.outcome),
    [config, attempt, state, execution.outcome],
  );

  const verifyStatus = steps.find((step) => step.id === "verify")?.status;
  const policyPassed = verifyStatus === "complete";
  const activeMandate = mandateCreator.activeMandate;
  const mandateTarget =
    config?.action === "SWAP"
      ? getSwapConfig()?.pool
      : config?.action === "TRANSFER"
        ? config.recipient
        : undefined;

  const configMatchesMandate =
    !!config &&
    !!activeMandate &&
    config.action === activeMandate.action &&
    mandateTarget === activeMandate.recipient &&
    config.maxPerAction === activeMandate.maxPerAction &&
    config.maxTotal === activeMandate.maxTotal;

  const canExecute =
    walletConnected &&
    policyPassed &&
    state.status !== "running" &&
    !!attempt &&
    attempt.target === "ALLOWED" &&
    configMatchesMandate &&
    (!!mandateCreator.sessionPubkey ||
      (!!mandateCreator.externalAgent &&
        mandateCreator.externalAgent ===
          env.NEXT_PUBLIC_AGENT_SESSION_PUBKEY)) &&
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
    <>
      <Card id="playground-create" className="scroll-mt-24 p-5 md:p-6">
        <Eyebrow>Step 3 / Create</Eyebrow>
        <h3 className="font-display mt-2 text-xl font-medium">
          Create your on-chain mandate
        </h3>
        <p className="text-fg-muted mt-1 text-sm">
          Approve the mandate in your wallet. If you do not have a vault yet,
          this step creates it automatically; no tokens move yet.
        </p>

        <MandateCreateSection
          config={config}
          walletConnected={walletConnected}
          executeBusy={execution.busy}
          controller={mandateCreator}
        />

        <details className="border-border-subtle mt-4 rounded-xl border p-4">
          <summary className="text-fg-muted hover:text-fg cursor-pointer text-sm font-medium">
            Save or restore a browser session
          </summary>
          <SessionVaultSection
            walletConnected={walletConnected}
            executeBusy={execution.busy}
            controller={mandateCreator}
          />
        </details>
      </Card>

      <Card id="playground-simulate" className="scroll-mt-24 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Step 4 / Simulate</Eyebrow>
            <h3 className="font-display mt-2 text-xl font-medium">
              Test the action before sending
            </h3>
          </div>
          <div aria-live="polite" className="shrink-0">
            {policyPassed && (
              <span className="border-success/40 bg-success/10 text-success rounded-full border px-3 py-1 text-xs font-medium">
                POLICY PASS
              </span>
            )}
            {verifyStatus === "blocked" && (
              <span className="border-danger/40 bg-danger/10 text-danger rounded-full border px-3 py-1 text-xs font-medium">
                BLOCKED
              </span>
            )}
          </div>
        </div>

        <p className="text-fg-muted mt-2 text-sm">
          Set the attempt amount and run a dry-run. Simulation does not sign or
          send a transaction and does not move funds.
        </p>
        <AgentAttemptFields config={config} form={attemptForm} />
        <SimulationControls
          action={config?.action ?? null}
          walletConnected={walletConnected}
          policyPassed={policyPassed}
          running={state.status === "running"}
          onRun={() => void start()}
        />

        <details className="border-border-subtle mt-5 border-t pt-4">
          <summary className="text-fg-muted hover:text-fg cursor-pointer text-sm font-medium">
            View policy checks and simulation logs
          </summary>
          <FlowStepList steps={steps} />
        </details>
      </Card>

      <Card id="playground-execute" className="scroll-mt-24 p-5 md:p-6">
        <Eyebrow>Step 5 / Execute</Eyebrow>
        <h3 className="font-display mt-2 text-xl font-medium">
          Send the action on Devnet
        </h3>
        <p className="text-fg-muted mt-1 text-sm">
          This sends a real Devnet transaction. Create the mandate, deposit test
          USDC into its vault, and pass the policy check before continuing.
        </p>

        <p className="text-fg-subtle mt-3 text-xs">
          {mandateCreator.externalAgent
            ? "External agent mode: you sign this job request; the Railway worker executes it on Devnet."
            : "Demo mode: the session key is stored in this browser, and your wallet approves every execution."}
        </p>

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

        {config?.action !== "SWAP" && (
          <details className="border-border-subtle mt-4 rounded-xl border p-4">
            <summary className="text-fg-muted hover:text-fg cursor-pointer text-sm font-medium">
              Advanced on-chain probe
            </summary>
            <OnchainProbeSection
              state={probe.state}
              ready={probe.ready}
              onRun={() => attempt && void probe.run(attempt)}
            />
          </details>
        )}

        <p className="border-border-subtle text-fg-subtle mt-5 border-t pt-4 text-xs">
          The local policy preview is for guidance. The on-chain mandate program
          is the authority for action limits and permissions.
        </p>
      </Card>
    </>
  );
}
