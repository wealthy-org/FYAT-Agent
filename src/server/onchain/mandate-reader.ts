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

const big = (value: { toString(): string }): bigint => BigInt(value.toString());

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
  if (!info) throw new OnchainReadError("Mandate account not found on chain");
  if (!info.owner.equals(programId)) {
    throw new OnchainReadError("Account is not owned by the mandate program");
  }

  let decoded: Record<string, unknown>;
  try {
    decoded = coder.decode("Mandate", info.data) as Record<string, unknown>;
  } catch {
    throw new OnchainReadError("Account is not a Mandate");
  }

  const vault = decoded.vault as PublicKey;
  const id = big(decoded.id as { toString(): string });

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
    session: (decoded.session as PublicKey).toBase58(),
    recipient: (decoded.recipient as PublicKey).toBase58(),
    maxPerAction: big(decoded.maxPerAction as { toString(): string }),
    maxTotal: big(decoded.maxTotal as { toString(): string }),
    spent: big(decoded.spent as { toString(): string }),
    createdAt: big(decoded.createdAt as { toString(): string }),
    expiresAt: big(decoded.expiresAt as { toString(): string }),
    revokedAt: big(decoded.revokedAt as { toString(): string }),
  };
}