import { amountPattern, formatUnits, parseUnits } from "@/lib/amount";
import { shortenAddress } from "@/lib/solana";

import {
  ASSET_SYMBOL,
  PREVIEW_SPENT_UNITS,
  USDC_DECIMALS,
  VENUE_OPTIONS,
} from "./constants";
import type {
  AgentAttempt,
  AttemptTarget,
  MandateConfig,
  PolicyEvaluation,
} from "./types";

/** 3_000_000n → "3 USDC" */
export function formatAmount(units: bigint): string {
  return `${formatUnits(units, USDC_DECIMALS)} ${ASSET_SYMBOL}`;
}

export function parseAttemptAmount(raw: string): bigint | null {
  const value = raw.trim();
  if (!amountPattern(USDC_DECIMALS).test(value)) return null;

  const units = parseUnits(value, USDC_DECIMALS);
  return units > 0n ? units : null;
}

/** Label tujuan untuk UI: yang diizinkan mandate vs yang di luar mandate. */
export function describeTargets(
  config: MandateConfig,
): Record<AttemptTarget, string> {
  if (config.action === "SWAP") {
    const venue = VENUE_OPTIONS.find((option) => option.value === config.venue);
    return {
      ALLOWED: venue?.label ?? config.venue,
      UNAPPROVED: "Unlisted venue",
    };
  }

  return {
    ALLOWED: shortenAddress(config.recipient),
    UNAPPROVED: "Agent's own wallet",
  };
}

export function evaluatePolicy(
  config: MandateConfig,
  attempt: AgentAttempt,
  spentUnits: bigint = PREVIEW_SPENT_UNITS,
): PolicyEvaluation {
  const remaining = config.maxTotal - spentUnits;
  const targets = describeTargets(config);

  const checks = [
    {
      id: "PER_ACTION_CAP",
      label: "Per-action cap",
      passed: attempt.amount <= config.maxPerAction,
      detail: `${formatAmount(attempt.amount)} vs cap ${formatAmount(config.maxPerAction)}`,
    },
    {
      id: "TOTAL_BUDGET",
      label: "Total budget",
      passed: attempt.amount <= remaining,
      detail: `${formatAmount(attempt.amount)} vs ${formatAmount(remaining)} remaining`,
    },
    {
      id: "ALLOWED_TARGET",
      label:
        config.action === "SWAP" ? "Approved venue" : "Approved recipient",
      passed: attempt.target === "ALLOWED",
      detail: `${targets[attempt.target]} ${
        attempt.target === "ALLOWED" ? "is" : "is not"
      } in the mandate`,
    },
  ] as const;

  return { allowed: checks.every((check) => check.passed), checks };
}