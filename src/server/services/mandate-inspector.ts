import "server-only";

import { PublicKey } from "@solana/web3.js";

import { getServerEnv } from "../env";
import { getConnection } from "../onchain/connection";
import {
  decodeMandateAccount,
  OnchainReadError,
  type OnchainMandate,
} from "../onchain/mandate-reader";
import { listOnchainMandatesByOwner } from "../repositories/mandates";

export type InspectorStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "UNVERIFIED";

export type InspectedMandate = {
  id: string;
  mandatePda: string;
  onchainId: string;
  sessionPubkey: string;
  recipient: string;
  maxPerAction: string;
  maxTotal: string;
  /** Dari chain bila akunnya terbaca, kalau tidak dari DB. */
  spent: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  status: InspectorStatus;
  /** true = nilai di atas berasal dari akun onchain. */
  chainVerified: boolean;
  /** DB sudah sama dengan chain untuk spent dan revoked. */
  dbInSync: boolean;
};

const iso = (unixSeconds: bigint) => new Date(Number(unixSeconds) * 1000).toISOString();

function chainStatus(onchain: OnchainMandate, nowSeconds: bigint): InspectorStatus {
  if (onchain.revokedAt !== 0n) return "REVOKED";
  if (onchain.expiresAt <= nowSeconds) return "EXPIRED";
  return "ACTIVE";
}

export async function inspectOwnerMandates(
  ownerPubkey: string,
  limit: number,
): Promise<InspectedMandate[]> {
  const rows = await listOnchainMandatesByOwner({ ownerPubkey, limit });
  if (rows.length === 0) return [];

  const { FYAT_PROGRAM_ID } = getServerEnv();
  const infos = await getConnection().getMultipleAccountsInfo(
    rows.map((r) => new PublicKey(r.mandatePda)),
    "confirmed",
  );
  const now = BigInt(Math.floor(Date.now() / 1000));

  return rows.map(({ mandate, mandatePda, onchainId }, index) => {
    let onchain: OnchainMandate | null = null;
    const info = infos[index];
    if (info) {
      try {
        onchain = decodeMandateAccount(info, {
          mandatePda,
          programId: FYAT_PROGRAM_ID,
        });
      } catch (error) {
        if (!(error instanceof OnchainReadError)) throw error;
      }
    }

    const base = {
      id: mandate.id,
      mandatePda,
      onchainId: onchainId.toString(),
      sessionPubkey: mandate.sessionPubkey,
      recipient: mandate.target,
      maxPerAction: mandate.maxPerAction.toString(),
      maxTotal: mandate.maxTotal.toString(),
      createdAt: mandate.createdAt.toISOString(),
    };

    if (!onchain) {
      return {
        ...base,
        spent: mandate.spent.toString(),
        expiresAt: mandate.expiresAt.toISOString(),
        revokedAt: mandate.revokedAt?.toISOString() ?? null,
        status: "UNVERIFIED" as const,
        chainVerified: false,
        dbInSync: false,
      };
    }

    return {
      ...base,
      spent: onchain.spent.toString(),
      expiresAt: iso(onchain.expiresAt),
      revokedAt: onchain.revokedAt === 0n ? null : iso(onchain.revokedAt),
      status: chainStatus(onchain, now),
      chainVerified: true,
      dbInSync:
        mandate.spent === onchain.spent &&
        (mandate.revokedAt !== null) === (onchain.revokedAt !== 0n),
    };
  });
}