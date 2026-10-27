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