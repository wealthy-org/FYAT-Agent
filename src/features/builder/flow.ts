import type { SimulationState } from "./simulation/types";
import { describeTargets, evaluatePolicy, formatAmount } from "./policy";
import type { AgentAttempt, MandateConfig, PolicyCheck } from "./types";

export type FlowStepId = "build" | "verify" | "simulate" | "execute";

export type FlowStepStatus =
  | "complete"
  | "blocked"
  | "failed"
  | "running"
  | "skipped"
  | "pending"
  | "idle";

export type FlowStep = {
  id: FlowStepId;
  title: string;
  status: FlowStepStatus;
  description: string;
  checks?: readonly PolicyCheck[];
  /** Log program dari simulasi. Selalu dirender sebagai teks. */
  logs?: readonly string[];
};

const TITLES = {
  build: "Build",
  verify: "Verify",
  simulate: "Simulate",
  execute: "Execute",
} as const satisfies Record<FlowStepId, string>;

const EXECUTE_PENDING =
  "Not run yet. Use Execute Transfer below once the simulation passes.";

/** Hasil eksekusi on-chain di sesi ini. Dikirim dari hook eksekusi. */
export type ExecutionState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; signature: string }
  | { kind: "failed"; message: string };

export const EXECUTION_IDLE: ExecutionState = { kind: "idle" };

type StepExtras = Pick<FlowStep, "checks" | "logs">;

function makeStep(
  id: FlowStepId,
  status: FlowStepStatus,
  description: string,
  extras: StepExtras = {},
): FlowStep {
  return { id, title: TITLES[id], status, description, ...extras };
}

function waitingSteps(buildMessage: string): readonly FlowStep[] {
  return [
    makeStep("build", "idle", buildMessage),
    makeStep("verify", "idle", "Mandate rules are checked once a plan exists."),
    makeStep("simulate", "idle", "Dry-run on Solana RPC before broadcasting."),
    makeStep("execute", "idle", "The session key signs and submits."),
  ];
}

/** Langkah Simulate dan Execute ditentukan oleh hasil dry-run. */
function simulationSteps(simulation: SimulationState): [FlowStep, FlowStep] {
  const executePending = makeStep("execute", "pending", EXECUTE_PENDING);
  const executeSkipped = makeStep(
    "execute",
    "skipped",
    "Nothing is signed or broadcast.",
  );

  if (simulation.status === "idle") {
    return [
      makeStep(
        "simulate",
        "pending",
        "Run the dry-run above to test this plan on Solana RPC.",
      ),
      executePending,
    ];
  }

  if (simulation.status === "running") {
    return [
      makeStep("simulate", "running", "Simulating on Solana RPC\u2026"),
      executePending,
    ];
  }

  const { outcome } = simulation;

  switch (outcome.kind) {
    case "PASSED": {
      const units =
        outcome.unitsConsumed === null
          ? ""
          : ` (${outcome.unitsConsumed.toLocaleString("en-US")} compute units)`;
      return [
        makeStep(
          "simulate",
          "complete",
          `Dry-run succeeded${units}. Nothing was signed or broadcast.`,
          { logs: outcome.logs },
        ),
        executePending,
      ];
    }
    case "FAILED":
      return [
        makeStep("simulate", "failed", outcome.message, { logs: outcome.logs }),
        executeSkipped,
      ];
    case "ERROR":
      return [makeStep("simulate", "failed", outcome.message), executeSkipped];
    case "UNSUPPORTED":
      return [makeStep("simulate", "pending", outcome.message), executePending];
  }
}

function applyExecution(
  steps: readonly FlowStep[],
  execution: ExecutionState,
): readonly FlowStep[] {
  if (execution.kind === "idle") return steps;

  return steps.map((step) => {
    if (step.id !== "execute") return step;

    switch (execution.kind) {
      case "running":
        return makeStep(
          "execute",
          "running",
          "Submitting the transfer to Solana.",
        );
      case "success":
        return makeStep(
          "execute",
          "complete",
          `Transfer confirmed on-chain. Signature: ${execution.signature}`,
        );
      case "failed":
        return makeStep(
          "execute",
          "failed",
          `Not executed: ${execution.message}`,
        );
    }
  });
}

export function buildFlowSteps(
  config: MandateConfig | null,
  attempt: AgentAttempt | null,
  simulation: SimulationState,
  execution: ExecutionState = EXECUTION_IDLE,
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
        { checks: evaluation.checks },
      ),
      makeStep("simulate", "skipped", "Not reached."),
      makeStep("execute", "skipped", "Nothing is signed or broadcast."),
    ];
  }

  const verify = makeStep(
    "verify",
    "complete",
    "All mandate rules satisfied.",
    { checks: evaluation.checks },
  );

  return applyExecution(
    [build, verify, ...simulationSteps(simulation)],
    execution,
  );
}
