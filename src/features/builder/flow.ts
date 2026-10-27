import {
  describeTargets,
  evaluatePolicy,
  formatAmount,
} from "./policy";
import type { AgentAttempt, MandateConfig, PolicyCheck } from "./types";

export type FlowStepId = "build" | "verify" | "simulate" | "execute";

export type FlowStepStatus =
  | "complete"
  | "blocked"
  | "skipped"
  | "pending"
  | "idle";

export type FlowStep = {
  id: FlowStepId;
  title: string;
  status: FlowStepStatus;
  description: string;
  checks?: readonly PolicyCheck[];
};

const TITLES = {
  build: "Build",
  verify: "Verify",
  simulate: "Simulate",
  execute: "Execute",
} as const satisfies Record<FlowStepId, string>;

function makeStep(
  id: FlowStepId,
  status: FlowStepStatus,
  description: string,
  checks?: readonly PolicyCheck[],
): FlowStep {
  return { id, title: TITLES[id], status, description, checks };
}

function waitingSteps(buildMessage: string): readonly FlowStep[] {
  return [
    makeStep("build", "idle", buildMessage),
    makeStep("verify", "idle", "Mandate rules are checked once a plan exists."),
    makeStep("simulate", "idle", "Dry-run on Solana RPC before broadcasting."),
    makeStep("execute", "idle", "The session key signs and submits."),
  ];
}

export function buildFlowSteps(
  config: MandateConfig | null,
  attempt: AgentAttempt | null,
): readonly FlowStep[] {
  if (!config) return waitingSteps("Complete the mandate configurator.");
  if (!attempt) {
    return waitingSteps("Enter a valid amount for the agent's attempt.");
  }

  const target = describeTargets(config)[attempt.target];
  const amount = formatAmount(attempt.amount);
  const summary =
    config.action === "SWAP"
      ? `Swap ${amount} via ${target}.`
      : `Transfer ${amount} to ${target}.`;

  const build = makeStep("build", "complete", summary);
  const evaluation = evaluatePolicy(config, attempt);

  if (!evaluation.allowed) {
    const failed = evaluation.checks.filter((check) => !check.passed).length;

    return [
      build,
      makeStep(
        "verify",
        "blocked",
        `Rejected by mandate: ${failed} ${failed === 1 ? "rule" : "rules"} failed.`,
        evaluation.checks,
      ),
      makeStep("simulate", "skipped", "Not reached."),
      makeStep("execute", "skipped", "Nothing is signed or broadcast."),
    ];
  }

  return [
    build,
    makeStep(
      "verify",
      "complete",
      "All mandate rules satisfied.",
      evaluation.checks,
    ),
    makeStep("simulate", "pending", "Dry-run on Solana RPC before broadcasting."),
    makeStep(
      "execute",
      "pending",
      "Session key signs; the program enforces limits onchain.",
    ),
  ];
}