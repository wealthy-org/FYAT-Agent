import "server-only";

import { createPublicKey, verify } from "node:crypto";

/** Header ASN.1 SPKI untuk public key Ed25519 mentah 32 byte. */
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

export function verifyEd25519(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): boolean {
  if (publicKey.length !== PUBLIC_KEY_BYTES) return false;
  if (signature.length !== SIGNATURE_BYTES) return false;

  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, publicKey]),
      format: "der",
      type: "spki",
    });
    return verify(null, message, key, signature);
  } catch {
    // Public key yang bukan titik kurva valid melempar error → anggap tidak valid.
    return false;
  }
}