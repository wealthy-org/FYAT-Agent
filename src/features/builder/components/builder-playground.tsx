"use client";

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
    // Ukuran mengikuti lebar wadahnya, bukan lebar layar.
    <div className="@container">
      <div className="grid gap-6">
        {/* Baris 1: dana dan status mandate */}
        <div className="grid items-start gap-6 @3xl:grid-cols-2">
          <VaultControlsPanel activeMandate={mandateCreator.activeMandate} />
          <MandateInspector />
        </div>

        {/* Baris 2: konfigurasi dan alur eksekusi */}
        <div className="grid items-start gap-6 @3xl:grid-cols-2">
          <MandateConfigurator form={mandateForm} />
          <ExecutionFlowPreview
            config={mandateForm.config}
            attemptForm={attemptForm}
            simulation={simulation}
            mandateCreator={mandateCreator}
          />
        </div>

        {/* Baris 3: kode */}
        <div className="min-w-0">
          <CodePreview
            config={mandateForm.config}
            attempt={attemptForm.attempt}
          />
        </div>
      </div>
    </div>
  );
}