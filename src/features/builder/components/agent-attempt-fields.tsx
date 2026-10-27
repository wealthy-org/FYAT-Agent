import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/form-fields";

import { ASSET_SYMBOL } from "../constants";
import type { AgentAttemptForm } from "../hooks/use-agent-attempt";
import { describeTargets } from "../policy";
import type { AttemptTarget, MandateConfig } from "../types";

type AgentAttemptFieldsProps = {
  config: MandateConfig | null;
  form: AgentAttemptForm;
};

export function AgentAttemptFields({ config, form }: AgentAttemptFieldsProps) {
  const { values, attempt, setAmount, setTarget } = form;

  const labels = config
    ? describeTargets(config)
    : { ALLOWED: "Approved", UNAPPROVED: "Not approved" };

  const legend =
    config?.action === "TRANSFER" ? "Agent sends to" : "Agent routes via";

  return (
    <div className="mt-8 space-y-5 rounded-xl border border-border-subtle bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-fg-subtle">
        Simulate an agent attempt
      </p>

      <TextField
        label="Amount the agent attempts"
        value={values.amount}
        onChange={(event) => setAmount(event.target.value)}
        error={
          attempt
            ? undefined
            : `Enter an amount above 0 with up to 6 decimals`
        }
        suffix={ASSET_SYMBOL}
        inputMode="decimal"
        autoComplete="off"
        maxLength={16}
      />

      <SegmentedControl<AttemptTarget>
        legend={legend}
        name="attempt-target"
        value={values.target}
        options={[
          { value: "ALLOWED", label: labels.ALLOWED },
          { value: "UNAPPROVED", label: labels.UNAPPROVED },
        ]}
        onChange={setTarget}
      />
    </div>
  );
}