import { z } from "zod";

import { amountPattern, parseUnits } from "@/lib/amount";
import { isValidSolanaAddress } from "@/lib/solana";

import {
  EXPIRY_HOURS,
  MAX_AMOUNT_UNITS,
  SWAP_VENUES,
  USDC_DECIMALS,
} from "./constants";

/** String user ("2.5") → bigint base unit, lengkap dengan batas atas dan bawah. */
const amountSchema = z
  .string()
  .trim()
  .regex(
    amountPattern(USDC_DECIMALS),
    `Enter an amount with up to ${USDC_DECIMALS} decimals, e.g. 5 or 2.5`,
  )
  .transform((value) => parseUnits(value, USDC_DECIMALS))
  .pipe(
    z
      .bigint()
      .positive("Must be greater than 0")
      .max(MAX_AMOUNT_UNITS, "Above the 10,000 USDC safety limit"),
  );

const solanaAddressSchema = z
  .string()
  .trim()
  .refine(isValidSolanaAddress, "Enter a valid Solana address");

const sharedShape = {
  maxPerAction: amountSchema,
  maxTotal: amountSchema,
  expiresInHours: z.enum(EXPIRY_HOURS).transform(Number),
};

const swapSchema = z.object({
  ...sharedShape,
  action: z.literal("SWAP"),
  venue: z.enum(SWAP_VENUES),
});

const transferSchema = z.object({
  ...sharedShape,
  action: z.literal("TRANSFER"),
  recipient: solanaAddressSchema,
});

export const mandateConfigSchema = z
  .discriminatedUnion("action", [swapSchema, transferSchema])
  .refine(
    (config) =>
      // Guard: bila salah satu field sudah gagal parse, nilainya masih string mentah.
      typeof config.maxPerAction !== "bigint" ||
      typeof config.maxTotal !== "bigint" ||
      config.maxPerAction <= config.maxTotal,
    {
      error: "Per-action cap cannot exceed the total budget",
      path: ["maxPerAction"],
    },
  );