"use client";

import { useAgentAttempt } from "../hooks/use-agent-attempt";
import { useMandateForm } from "../hooks/use-mandate-form";
import { ExecutionFlowPreview } from "./execution-flow-preview";
import { MandateConfigurator } from "./mandate-configurator";

export function BuilderPlayground() {
  const mandateForm = useMandateForm();
  const attemptForm = useAgentAttempt();

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <MandateConfigurator form={mandateForm} />
      <ExecutionFlowPreview
        config={mandateForm.config}
        attemptForm={attemptForm}
      />
    </div>
  );
}