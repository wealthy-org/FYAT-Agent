/** Header yang membawa bukti identitas. Body request murni payload. */
export const AUTH_HEADERS = {
  wallet: "x-fyat-wallet",
  signature: "x-fyat-signature",
  nonce: "x-fyat-nonce",
  issuedAt: "x-fyat-issued-at",
} as const;

export type AuthMessageFields = {
  /** Host aplikasi, misalnya "localhost:3000". */
  domain: string;
  wallet: string;
  method: string;
  path: string;
  /** SHA-256 hex dari body mentah (string UTF-8 persis seperti yang dikirim). */
  bodyHash: string;
  /** 16 byte acak dalam hex (32 karakter). */
  nonce: string;
  /** ISO-8601 UTC dengan milidetik, misalnya 2026-10-27T10:00:00.000Z */
  issuedAt: string;
};

/**
 * Teks yang ditampilkan wallet saat meminta tanda tangan.
 * Semua field divalidasi ketat di server SEBELUM fungsi ini dipanggil,
 * sehingga tidak ada karakter baris baru yang bisa menyelundupkan field palsu.
 */
export function buildAuthMessage(fields: AuthMessageFields): string {
  return [
    "FYAT Agent: authorize this request",
    "",
    `Domain: ${fields.domain}`,
    `Wallet: ${fields.wallet}`,
    `Request: ${fields.method} ${fields.path}`,
    `Body SHA-256: ${fields.bodyHash}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    "",
    "Sign only if you started this action on the site above.",
  ].join("\n");
}