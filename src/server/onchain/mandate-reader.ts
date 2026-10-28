import "server-only";

import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import idlJson from "@/lib/idl/fyat_mandate.json";
import { findMandatePda } from "@/lib/mandate-address";

const coder = new BorshAccountsCoder(idlJson as Idl);

export type OnchainMandate = {
  pda: string;
  vault: string;
  id: bigint;
  session: string;
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
      `Mandate field "${field}" tidak ditemukan atau tidak valid. Periksa IDL dan layout akun yang ter-deploy.`,
    );
  }

  try {
    return BigInt(value.toString());
  } catch {
    throw new OnchainReadError(
      `Mandate field "${field}" bukan bilangan yang valid.`,
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
      `Mandate field "${field}" tidak ditemukan atau bukan PublicKey.`,
    );
  }

  return value as PublicKey;
}

/**
 * Membaca akun Mandate dari chain dan memastikan akun itu asli:
 * dimiliki program, discriminator-nya Mandate, dan PDA-nya sama dengan
 * turunan dari (vault, id) di dalam akunnya sendiri.
 */
export async function readMandate(
  connection: Connection,
  args: { mandatePda: string; programId: string },
): Promise<OnchainMandate> {
  const pda = new PublicKey(args.mandatePda);
  const programId = new PublicKey(args.programId);

  const info = await connection.getAccountInfo(pda, "confirmed");

  if (!info) {
    throw new OnchainReadError("Mandate account not found on chain");
  }

  if (!info.owner.equals(programId)) {
    throw new OnchainReadError(
      "Account is not owned by the mandate program",
    );
  }

  let decoded: Record<string, unknown>;

  try {
    decoded = coder.decode("Mandate", info.data) as Record<string, unknown>;
  } catch {
    throw new OnchainReadError(
      "Account is not a Mandate. Periksa IDL yang digunakan aplikasi.",
    );
  }

  const vaultKey = readPublicKey(decoded.vault, "vault");
  const id = readBig(decoded.id, "id");

  const expected = findMandatePda({
    vault: vaultKey.toBase58(),
    id,
    programId: args.programId,
  });

  if (expected !== pda.toBase58()) {
    throw new OnchainReadError(
      "Mandate PDA does not match its vault and id",
    );
  }

  return {
    pda: pda.toBase58(),
    vault: vaultKey.toBase58(),
    id,
    session: readPublicKey(decoded.session, "session").toBase58(),
    recipient: readPublicKey(decoded.recipient, "recipient").toBase58(),
    maxPerAction: readBig(decodedField(decoded, "max_per_action", "maxPerAction"), "maxPerAction"),
    maxTotal: readBig(decodedField(decoded, "max_total", "maxTotal"), "maxTotal"),
    spent: readBig(decoded.spent, "spent"),
    createdAt: readBig(decodedField(decoded, "created_at", "createdAt"), "createdAt"),
    expiresAt: readBig(decodedField(decoded, "expires_at", "expiresAt"), "expiresAt"),
    revokedAt: readBig(decodedField(decoded, "revoked_at", "revokedAt"), "revokedAt"),
  };
}


