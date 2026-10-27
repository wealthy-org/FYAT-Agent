import "server-only";

import { createHash } from "node:crypto";

import { PublicKey } from "@solana/web3.js";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { AUTH_HEADERS, buildAuthMessage } from "@/lib/auth-message";
import { isValidSolanaAddress } from "@/lib/solana";

import { ApiErrors } from "../api/errors";
import { getServerEnv } from "../env";
import { consumeNonce } from "../repositories/auth-nonces";
import { verifyEd25519 } from "./ed25519";

/** Signature yang lebih tua dari ini ditolak. */
const MAX_AGE_MS = 5 * 60_000;
/** Toleransi jam klien yang sedikit lebih cepat dari server. */
const MAX_FUTURE_SKEW_MS = 60_000;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const authHeadersSchema = z.object({
  wallet: z.string().refine(isValidSolanaAddress),
  // 64 byte → base64 tepat 88 karakter, berakhiran "=="
  signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/),
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
  issuedAt: z.string().regex(ISO_UTC),
});

/**
 * Membuktikan bahwa pengirim memegang private key `wallet`.
 * Mengembalikan alamat wallet yang terautentikasi, atau melempar 401.
 */
export async function authenticateRequest(
  req: NextRequest,
  rawBody: string,
): Promise<string> {
  const parsed = authHeadersSchema.safeParse({
    wallet: req.headers.get(AUTH_HEADERS.wallet),
    signature: req.headers.get(AUTH_HEADERS.signature),
    nonce: req.headers.get(AUTH_HEADERS.nonce),
    issuedAt: req.headers.get(AUTH_HEADERS.issuedAt),
  });
  if (!parsed.success) throw ApiErrors.unauthenticated();

  const { wallet, signature, nonce, issuedAt } = parsed.data;

  // 1. Waktu: bentuk kanonik + jendela umur.
  const issuedMs = Date.parse(issuedAt);
  if (
    !Number.isFinite(issuedMs) ||
    new Date(issuedMs).toISOString() !== issuedAt
  ) {
    throw ApiErrors.unauthenticated();
  }

  const age = Date.now() - issuedMs;
  if (age > MAX_AGE_MS || age < -MAX_FUTURE_SKEW_MS) {
    throw ApiErrors.unauthenticated(
      "Signature expired or your clock is out of sync. Please try again.",
    );
  }

  // 2. Pesan dirakit ULANG oleh server. Domain berasal dari konfigurasi server.
  const message = buildAuthMessage({
    domain: new URL(getServerEnv().APP_URL).host,
    wallet,
    method: req.method,
    path: req.nextUrl.pathname,
    bodyHash: createHash("sha256").update(rawBody, "utf8").digest("hex"),
    nonce,
    issuedAt,
  });

  // 3. Signature.
  const valid = verifyEd25519(
    new PublicKey(wallet).toBytes(),
    new TextEncoder().encode(message),
    Buffer.from(signature, "base64"),
  );
  if (!valid) throw ApiErrors.unauthenticated();

  // 4. Nonce dicatat HANYA setelah signature valid, supaya penyerang tanpa
  //    kunci tidak bisa membanjiri tabel nonce. Disimpan lebih lama dari jendela
  //    penerimaan sehingga tidak ada celah replay.
  const fresh = await consumeNonce({
    nonce,
    wallet,
    expiresAt: new Date(issuedMs + MAX_AGE_MS + MAX_FUTURE_SKEW_MS),
  });
  if (!fresh) throw ApiErrors.unauthenticated();

  return wallet;
}