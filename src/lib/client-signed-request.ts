"use client";

import { AUTH_HEADERS, buildAuthMessage } from "@/lib/auth-message";

export type WalletMessageSigner = {
  publicKey: { toBase58(): string } | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

type ApiErrorBody = {
  error?: string | {
    code?: string;
    message?: string;
    issues?: Array<{
      path: string;
      message: string;
    }>;
    requestId?: string;
  };
};

export async function signedJsonRequest<T>(
  wallet: WalletMessageSigner,
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload: unknown,
): Promise<T> {
  if (!wallet.publicKey || !wallet.signMessage) {
    throw new Error("Wallet tidak mendukung tanda tangan pesan.");
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Path API tidak valid.");
  }

  const body = JSON.stringify(payload);
  const walletAddress = wallet.publicKey.toBase58();
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(nonceBytes, (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const issuedAt = new Date().toISOString();

  const bodyHashBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body),
  );
  const bodyHash = Array.from(new Uint8Array(bodyHashBytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  const message = buildAuthMessage({
    domain: window.location.host,
    wallet: walletAddress,
    method,
    path,
    bodyHash,
    nonce,
    issuedAt,
  });

  const signature = await wallet.signMessage(
    new TextEncoder().encode(message),
  );
  let binary = "";
  for (const byte of signature) {
    binary += String.fromCharCode(byte);
  }
  const signatureBase64 = btoa(binary);

  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      [AUTH_HEADERS.wallet]: walletAddress,
      [AUTH_HEADERS.signature]: signatureBase64,
      [AUTH_HEADERS.nonce]: nonce,
      [AUTH_HEADERS.issuedAt]: issuedAt,
    },
    body,
  });

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = result as ApiErrorBody | null;
    const error = body?.error;

    if (typeof error === "string") {
      throw new Error(error);
    }

    if (error && typeof error === "object") {
      const details = error.issues
        ?.map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ");

      const message = error.message ?? "Permintaan API gagal.";
      const code = error.code ? `[${error.code}] ` : "";

      throw new Error(
        `${code}${message}${details ? ` — ${details}` : ""}`,
      );
    }

    throw new Error(`Permintaan API gagal (${response.status}).`);
  }

  return result as T;
}
