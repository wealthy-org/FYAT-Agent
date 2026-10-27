"use client";

import { useAgentAttempt } from "../hooks/use-agent-attempt";
import { useMandateForm } from "../hooks/use-mandate-form";
import { useSimulation } from "../hooks/use-simulation";
import { CodePreview } from "./code-preview";
import { ExecutionFlowPreview } from "./execution-flow-preview";
import { MandateConfigurator } from "./mandate-configurator";

export function BuilderPlayground() {
  const mandateForm = useMandateForm();
  const attemptForm = useAgentAttempt();
  const simulation = useSimulation(mandateForm.config, attemptForm.attempt);

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 xl:items-start">
      <MandateConfigurator form={mandateForm} />

      <ExecutionFlowPreview
        config={mandateForm.config}
        attemptForm={attemptForm}
        simulation={simulation}
      />

      <div className="min-w-0 lg:col-span-2 xl:col-span-1">
        <CodePreview
          config={mandateForm.config}
          attempt={attemptForm.attempt}
        />
      </div>
    </div>
  );
}