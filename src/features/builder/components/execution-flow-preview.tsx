import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

import { buildFlowSteps } from "../flow";
import type { AgentAttemptForm } from "../hooks/use-agent-attempt";
import type { MandateConfig } from "../types";
import { AgentAttemptFields } from "./agent-attempt-fields";
import { FlowStepList } from "./flow-step-list";

type ExecutionFlowPreviewProps = {
  config: MandateConfig | null;
  attemptForm: AgentAttemptForm;
};

export function ExecutionFlowPreview({
  config,
  attemptForm,
}: ExecutionFlowPreviewProps) {
  const { attempt } = attemptForm;

  const steps = useMemo(
    () => buildFlowSteps(config, attempt),
    [config, attempt],
  );

  const verifyStatus = steps.find((step) => step.id === "verify")?.status;

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>2 / Execution flow</Eyebrow>
          <h3 className="mt-2 font-display text-xl font-medium">
            Build → Verify → Simulate → Execute
          </h3>
        </div>

        {/* Selalu dirender agar perubahan verdict diumumkan screen reader */}
        <div aria-live="polite" className="shrink-0">
          {verifyStatus === "complete" && (
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

      <AgentAttemptFields config={config} form={attemptForm} />

      <FlowStepList steps={steps} />

      <p className="mt-8 border-t border-border-subtle pt-4 text-xs text-fg-subtle">
        Rules are checked locally as a preview. Real enforcement happens in the
        mandate program onchain.
      </p>
    </Card>
  );
}