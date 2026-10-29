import "server-only";
import { z } from "zod";
import { isValidSolanaAddress } from "@/lib/solana";
import { FYAT_PROGRAM_ID as IDL_PROGRAM_ID } from "@/lib/program-id";

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
  DAMM_POOL: solanaAddress.optional(),
  SWAP_OUTPUT_MINT: solanaAddress.optional(),
  AGENT_SESSION_PUBKEY: solanaAddress.optional(),
  WORKER_API_SECRET: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{32,128}$/,
      "must be a 32-128 character URL-safe secret",
    )
    .optional(),
  FAUCET_TREASURY_SECRET_KEY: z.string().optional(),
  FAUCET_SOL_DRIP_LAMPORTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER)
    .default(100_000_000),
  FAUCET_TOKEN_DRIP_UNITS: z
    .string()
    .regex(/^[1-9]\d{0,19}$/)
    .refine(
      (value) => BigInt(value) <= 18_446_744_073_709_551_615n,
      "must fit into a u64",
    )
    .default("50000000"),
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
    DAMM_POOL: process.env.NEXT_PUBLIC_DAMM_POOL || undefined,
    SWAP_OUTPUT_MINT: process.env.NEXT_PUBLIC_SWAP_OUTPUT_MINT || undefined,
    AGENT_SESSION_PUBKEY:
      process.env.AGENT_SESSION_PUBKEY ||
      process.env.NEXT_PUBLIC_AGENT_SESSION_PUBKEY ||
      undefined,
    WORKER_API_SECRET: process.env.WORKER_API_SECRET || undefined,
    FAUCET_TREASURY_SECRET_KEY:
      process.env.FAUCET_TREASURY_SECRET_KEY || undefined,
    FAUCET_SOL_DRIP_LAMPORTS: process.env.FAUCET_SOL_DRIP_LAMPORTS,
    FAUCET_TOKEN_DRIP_UNITS: process.env.FAUCET_TOKEN_DRIP_UNITS || undefined,
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

  // Env dan IDL harus menunjuk program yang sama. Setelah redeploy ke ID baru,
  // salin IDL baru ke src/lib/idl/ dan perbarui FYAT_PROGRAM_ID.
  if (parsed.data.FYAT_PROGRAM_ID !== IDL_PROGRAM_ID) {
    throw new Error(
      `FYAT_PROGRAM_ID (${parsed.data.FYAT_PROGRAM_ID}) != IDL address (${IDL_PROGRAM_ID}). ` +
        "Update src/lib/idl/fyat_mandate.json or FYAT_PROGRAM_ID.",
    );
  }

  cached = parsed.data;
  return cached;
}
