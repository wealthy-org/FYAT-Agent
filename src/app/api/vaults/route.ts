import { NextResponse, type NextRequest } from "next/server";

import { ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { emptyBodySchema } from "@/server/api/schemas";
import { serializeVault } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { isUniqueViolation } from "@/server/db/client";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError } from "@/server/onchain/mandate-reader";
import { readVault } from "@/server/onchain/vault-reader";
import { findVaultByPda, insertVault } from "@/server/repositories/vaults";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { deriveVaultAddress } from "@/server/solana/vault-address";

export const runtime = "nodejs"; // memakai node:crypto

export async function POST(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.vaultWrite, async () => {
    const { wallet } = await readSignedJson(req, emptyBodySchema);
    const vaultPda = deriveVaultAddress(wallet);

    // Jalur cepat: sudah terdaftar, tidak perlu ke chain lagi.
    const existing = await findVaultByPda(vaultPda);
    if (existing) {
      return NextResponse.json({ vault: serializeVault(existing) });
    }

    // Chain sebagai sumber kebenaran: vault harus benar-benar ada di chain.
    const env = getServerEnv();
    try {
      await readVault(getConnection(), {
        vaultPda,
        programId: env.FYAT_PROGRAM_ID,
        expectedOwner: wallet,
        expectedMint: env.TOKEN_MINT,
      });
    } catch (error) {
      if (error instanceof OnchainReadError) {
        throw ApiErrors.validation([
          { path: "vault", message: error.message },
        ]);
      }
      throw error;
    }

    try {
      const vault = await insertVault({
        ownerPubkey: wallet,
        vaultPda,
        tokenMint: env.TOKEN_MINT,
      });
      return NextResponse.json(
        { vault: serializeVault(vault) },
        { status: 201 },
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      // Kalah balapan dengan request paralel yang sama: vault kini sudah ada.
      const vault = await findVaultByPda(vaultPda);
      if (vault) return NextResponse.json({ vault: serializeVault(vault) });
      throw error;
    }
  });
}