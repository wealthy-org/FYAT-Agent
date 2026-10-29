"use client";

import { useState } from "react";

import { FaucetClaimBanner } from "./faucet-claim-banner";
import { PlaygroundStepNav } from "./playground-step-nav";
import { useAgentAttempt } from "../hooks/use-agent-attempt";
import { useCreateMandate } from "../hooks/use-create-mandate";
import { useMandateForm } from "../hooks/use-mandate-form";
import { useSimulation } from "../hooks/use-simulation";
import { CodePreview } from "./code-preview";
import { ExecutionFlowPreview } from "./execution-flow-preview";
import { MandateConfigurator } from "./mandate-configurator";
import { MandateInspector } from "./mandate-inspector";
import { VaultControlsPanel } from "./vault-controls-panel";

export function BuilderPlayground() {
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const mandateForm = useMandateForm();
  const attemptForm = useAgentAttempt();
  const mandateCreator = useCreateMandate();
  const simulation = useSimulation(
    mandateForm.config,
    attemptForm.attempt,
    mandateCreator.activeMandate,
    mandateCreator.sessionPubkey || mandateCreator.externalAgent,
  );

  return (
    <div className="@container mx-auto w-full max-w-4xl space-y-5">
      <FaucetClaimBanner
        onClaimed={() => setBalanceRefreshKey((key) => key + 1)}
      />
      <PlaygroundStepNav />

      <div className="grid items-start gap-5">
        <VaultControlsPanel
          activeMandate={mandateCreator.activeMandate}
          balanceRefreshKey={balanceRefreshKey}
        />
        <MandateConfigurator form={mandateForm} />
        <ExecutionFlowPreview
          config={mandateForm.config}
          attemptForm={attemptForm}
          simulation={simulation}
          mandateCreator={mandateCreator}
        />
        <section
          id="playground-review"
          aria-label="Review mandate and generated code"
          className="grid min-w-0 scroll-mt-24 items-start gap-5 @3xl:grid-cols-2"
        >
          <MandateInspector />
          <CodePreview
            config={mandateForm.config}
            attempt={attemptForm.attempt}
          />
        </section>
      </div>
    </div>
  );
}
