import type { z } from "zod";

import type { MANDATE_ACTIONS } from "./constants";
import type { mandateConfigSchema } from "./schema";

export type MandateAction = (typeof MANDATE_ACTIONS)[number];

/** Hasil parse yang valid: jumlah sudah bigint, expiry sudah number. */
export type MandateConfig = z.output<typeof mandateConfigSchema>;

/** Apa adanya dari input user: semuanya string. */
export type MandateFormValues = {
  action: MandateAction;
  venue: string;
  recipient: string;
  maxPerAction: string;
  maxTotal: string;
  expiresInHours: string;
};

export type MandateFieldName = keyof MandateFormValues;

/* ----------------------- Agent attempt & policy ----------------------- */

/** Tujuan yang dicoba agent: sesuai mandate, atau di luar mandate. */
export type AttemptTarget = "ALLOWED" | "UNAPPROVED";

export type AgentAttempt = {
  amount: bigint;
  target: AttemptTarget;
};

export type PolicyCheckId =
  | "PER_ACTION_CAP"
  | "TOTAL_BUDGET"
  | "ALLOWED_TARGET";

export type PolicyCheck = {
  id: PolicyCheckId;
  label: string;
  passed: boolean;
  detail: string;
};

export type PolicyEvaluation = {
  allowed: boolean;
  checks: readonly PolicyCheck[];
};