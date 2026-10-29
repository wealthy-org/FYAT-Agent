import "server-only";

import type { NextRequest } from "next/server";

import { ApiErrors } from "../api/errors";
import { pruneSecurityTables } from "../repositories/maintenance";
import { registerHit } from "../repositories/rate-limits";
import { getClientIp } from "./client-ip";

export type RateLimitRule = {
  /** Nama bucket, bagian dari kunci counter. */
  name: string;
  limit: number;
  windowSeconds: number;
};

/** Semua batas ada di satu tempat agar mudah ditinjau dan disesuaikan. */
export const RATE_LIMITS = {
  vaultWrite: { name: "vault-write", limit: 10, windowSeconds: 60 },
  mandateWrite: { name: "mandate-write", limit: 20, windowSeconds: 60 },
  mandateRevoke: { name: "mandate-revoke", limit: 30, windowSeconds: 60 },
  mandateExecute: { name: "mandate-execute", limit: 30, windowSeconds: 60 },
  receiptsRead: { name: "receipts-read", limit: 60, windowSeconds: 60 },
  mandatesRead: { name: "mandates-read", limit: 30, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

/** Peluang membersihkan tabel keamanan pada tiap request. */
const PRUNE_PROBABILITY = 0.02;

export async function enforceRateLimit(
  req: NextRequest,
  rule: RateLimitRule,
): Promise<void> {
  const hits = await registerHit(
    `${rule.name}:${getClientIp(req)}`,
    rule.windowSeconds,
  );

  if (Math.random() < PRUNE_PROBABILITY) {
    // Pembersihan gagal tidak boleh menggagalkan request.
    await pruneSecurityTables().catch(() => undefined);
  }

  if (hits > rule.limit) {
    const elapsed = (Date.now() / 1000) % rule.windowSeconds;
    throw ApiErrors.rateLimited(Math.ceil(rule.windowSeconds - elapsed));
  }
}
