import "server-only";

import { firstRow, query, requireRow } from "../db/client";
import { toDate } from "../db/mappers";
import type { Vault } from "../models";

type VaultRow = {
  id: string;
  owner_pubkey: string;
  vault_pda: string;
  token_mint: string;
  created_at: Date | string;
};

const COLUMNS = "v.id, v.owner_pubkey, v.vault_pda, v.token_mint, v.created_at";

function toVault(row: VaultRow): Vault {
  return {
    id: row.id,
    ownerPubkey: row.owner_pubkey,
    vaultPda: row.vault_pda,
    tokenMint: row.token_mint,
    createdAt: toDate(row.created_at),
  };
}

export type NewVault = {
  ownerPubkey: string;
  vaultPda: string;
  tokenMint: string;
};

/**
 * Melempar error UNIQUE bila `vaultPda` sudah terdaftar (cek `isUniqueViolation`).
 * Repository TIDAK memverifikasi bahwa PDA benar-benar milik owner. Itu tugas Step 8.
 */
export async function insertVault(input: NewVault): Promise<Vault> {
  const rows = await query<VaultRow>(
    `INSERT INTO vaults AS v (owner_pubkey, vault_pda, token_mint)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [input.ownerPubkey, input.vaultPda, input.tokenMint],
  );

  return toVault(requireRow(rows));
}

export async function findVaultByPda(vaultPda: string): Promise<Vault | null> {
  const rows = await query<VaultRow>(
    `SELECT ${COLUMNS} FROM vaults AS v WHERE v.vault_pda = $1`,
    [vaultPda],
  );

  const row = firstRow(rows);
  return row ? toVault(row) : null;
}