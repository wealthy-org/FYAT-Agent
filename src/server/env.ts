import "server-only";

import { z } from "zod";

import { isValidSolanaAddress } from "@/lib/solana";

const solanaAddress = z
  .string()
  .refine(isValidSolanaAddress, "must be a valid Solana address");

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      "must be a postgres:// or postgresql:// connection string",
    ),
  APP_URL: z
    .string()
    .refine((value) => /^https?:\/\//.test(value) && URL.canParse(value), {
      error: "must be an http(s) URL",
    })
    .default("http://localhost:3000"),
  FYAT_PROGRAM_ID: solanaAddress,
  TOKEN_MINT: solanaAddress,
  SOLANA_RPC_URL: z.url(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    FYAT_PROGRAM_ID: process.env.FYAT_PROGRAM_ID,
    TOKEN_MINT: process.env.NEXT_PUBLIC_TOKEN_MINT,
    SOLANA_RPC_URL:
      process.env.SOLANA_RPC_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      "https://api.devnet.solana.com",
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
    );
  }

  cached = parsed.data;
  return cached;
}