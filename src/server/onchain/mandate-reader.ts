import "server-only";

import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, type AccountInfo } from "@solana/web3.js";
import idlJson from "@/lib/idl/fyat_mandate.json";
import { findMandatePda } from "@/lib/mandate-address";
import type { MandateAction } from "@/features/builder";


const coder = new BorshAccountsCoder(idlJson as Idl);

export type OnchainMandate = {
  pda: string;
  vault: string;
  id: bigint;
  session: string;
  action: MandateAction;
  recipient: string;
  maxPerAction: bigint;
  maxTotal: bigint;
  spent: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  /** 0n = belum dicabut. */
  revokedAt: bigint;
};

export class OnchainReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnchainReadError";
  }
}

function decodedField(
  decoded: Record<string, unknown>,
  snake: string,
  camel: string,
): unknown {
  return decoded[camel] ?? decoded[snake];
}
function readBig(value: unknown, field: string): bigint {
  if (
    value === undefined ||
    value === null ||
    (typeof value !== "object" && typeof value !== "number" && typeof value !== "bigint" && typeof value !== "string")
  ) {
    throw new OnchainReadError(
      `Mandate field "${field}" was not found or is invalid. Check the IDL and deployed account layout.`,
    );
  }

  try {
    return BigInt(value.toString());
  } catch {
    throw new OnchainReadError(
      `Mandate field "${field}" is not a valid integer.`,
    );
  }
}

function readPublicKey(value: unknown, field: string): PublicKey {
  if (
    value === undefined ||
    value === null ||
    typeof value !== "object" ||
    typeof (value as { toBase58?: unknown }).toBase58 !== "function"
  ) {
    throw new OnchainReadError(
      `Mandate field "${field}" was not found or is not a PublicKey.`,
    );
  }

  return value as PublicKey;
}

function readAction(value: unknown): MandateAction {
  if (value && typeof value === "object") {
    if ("transfer" in value) return "TRANSFER";
    if ("swap" in value) return "SWAP";
  }
  if (value === "transfer") return "TRANSFER";
  if (value === "swap") return "SWAP";
  throw new OnchainReadError("Mandate action is missing or invalid.");
}
/**
 * Membaca akun Mandate dari chain dan memastikan akun itu asli:
 * dimiliki program, discriminator-nya Mandate, dan PDA-nya sama dengan
 * turunan dari (vault, id) di dalam akunnya sendiri.
 */
/**
 * Memvalidasi dan men-decode satu akun Mandate: dimiliki program,
 * discriminator Mandate, dan PDA cocok dengan turunan (vault, id).
 */
export function decodeMandateAccount(
  info: AccountInfo<Buffer>,
  args: { mandatePda: string; programId: string },
): OnchainMandate {
  const pda = new PublicKey(args.mandatePda);
  if (!info.owner.equals(new PublicKey(args.programId))) {
    throw new OnchainReadError("Account is not owned by the mandate program");
  }

  let decoded: Record<string, unknown>;
  try {
    decoded = coder.decode("Mandate", info.data) as Record<string, unknown>;
  } catch {
    throw new OnchainReadError("Account is not a Mandate");
  }

  const field = (snake: string, camel: string) =>
    decodedField(decoded, snake, camel);

  const vault = readPublicKey(field("vault", "vault"), "vault");
  const id = readBig(field("id", "id"), "id");

  const expected = findMandatePda({
    vault: vault.toBase58(),
    id,
    programId: args.programId,
  });
  if (expected !== pda.toBase58()) {
    throw new OnchainReadError("Mandate PDA does not match its vault and id");
  }

  return {
    pda: pda.toBase58(),
    vault: vault.toBase58(),
    id,
    session: readPublicKey(field("session", "session"), "session").toBase58(),
    action: readAction(field("action", "action")),
    recipient: readPublicKey(field("recipient", "recipient"), "recipient").toBase58(),
    maxPerAction: readBig(field("max_per_action", "maxPerAction"), "max_per_action"),
    maxTotal: readBig(field("max_total", "maxTotal"), "max_total"),
    spent: readBig(field("spent", "spent"), "spent"),
    createdAt: readBig(field("created_at", "createdAt"), "created_at"),
    expiresAt: readBig(field("expires_at", "expiresAt"), "expires_at"),
    revokedAt: readBig(field("revoked_at", "revokedAt"), "revoked_at"),
  };
}

export async function readMandate(
  connection: Connection,
  args: { mandatePda: string; programId: string },
): Promise<OnchainMandate> {
  const info = await connection.getAccountInfo(
    new PublicKey(args.mandatePda),
    "confirmed",
  );
  if (!info) throw new OnchainReadError("Mandate account not found on chain");
  return decodeMandateAccount(info, args);
}