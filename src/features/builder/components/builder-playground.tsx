"use client";

import { useAgentAttempt } from "../hooks/use-agent-attempt";
import { useCreateMandate } from "../hooks/use-create-mandate";
import { useMandateForm } from "../hooks/use-mandate-form";
import { useSimulation } from "../hooks/use-simulation";
import { CodePreview } from "./code-preview";
import { ExecutionFlowPreview } from "./execution-flow-preview";
import { MandateConfigurator } from "./mandate-configurator";

export function BuilderPlayground() {
  const mandateForm = useMandateForm();
  const attemptForm = useAgentAttempt();
  const simulation = useSimulation(mandateForm.config, attemptForm.attempt);
  const mandateCreator = useCreateMandate();

  return (
    // Ukuran mengikuti lebar wadahnya, bukan lebar layar.
    <div className="@container">
      <div className="grid gap-6 @3xl:grid-cols-2 @7xl:grid-cols-3 @7xl:items-start">
        <MandateConfigurator form={mandateForm} />

        <ExecutionFlowPreview
          config={mandateForm.config}
          attemptForm={attemptForm}
          simulation={simulation}
          mandateCreator={mandateCreator}
        />

        <div className="min-w-0 @3xl:col-span-2 @7xl:col-span-1">
          <CodePreview
            config={mandateForm.config}
            attempt={attemptForm.attempt}
          />
        </div>
      </div>
    </div>
  );
}
