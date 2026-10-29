
import { Keypair } from "@solana/web3.js";
import type { MandateAction } from "../types";

const PREFIX = "fyat:encrypted-session:v1:";
const ITERATIONS = 600_000;

export type StoredSession = {
  id: string;
  mandatePda: string;
  owner: string;
  mint: string;
  action?: MandateAction;
  recipient: string;
  maxPerAction: string;
  maxTotal: string;
  sessionPublicKey: string;
  secretKey: number[];
};

type EncryptedSessionEnvelope = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};

function storageKey(owner: string, mandatePda: string): string {
  return `${PREFIX}${owner}:${mandatePda}`;
}

function indexKey(owner: string): string {
  return `${PREFIX}index:${owner}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    material,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function assertBrowser(): void {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("This browser does not support Web Crypto.");
  }
}

/** Satu-satunya sumber aturan passphrase; dipakai juga oleh hook dan UI. */
export const MIN_PASSPHRASE_LENGTH = 12;

export function isPassphraseValid(passphrase: string): boolean {
  return passphrase.trim().length >= MIN_PASSPHRASE_LENGTH;
}

function validatePassphrase(passphrase: string): void {
  if (!isPassphraseValid(passphrase)) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
}

function isEnvelope(value: unknown): value is EncryptedSessionEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.version === 1 &&
    typeof candidate.salt === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

export function listStoredSessions(owner: string): string[] {
  assertBrowser();

  try {
    const value = localStorage.getItem(indexKey(owner));

    if (!value) {
      return [];
    }

    const parsed: unknown = JSON.parse(value);

    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === "string")
    ) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export async function saveEncryptedSession(args: {
  passphrase: string;
  session: StoredSession;
}): Promise<void> {
  const { passphrase, session } = args;

  assertBrowser();
  validatePassphrase(passphrase);

  if (
    !session.owner ||
    !session.mandatePda ||
    !session.sessionPublicKey ||
    session.secretKey.length !== 64
  ) {
    throw new Error("The session key data is incomplete or invalid.");
  }

  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(session.secretKey),
  );

  if (keypair.publicKey.toBase58() !== session.sessionPublicKey) {
    throw new Error("The session key does not match the public key.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const plaintext = new TextEncoder().encode(JSON.stringify(session));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintext,
  );

  const envelope: EncryptedSessionEnvelope = {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };

  const recordKey = storageKey(session.owner, session.mandatePda);

  // Simpan ciphertext saja; secret key tidak disimpan dalam bentuk plaintext.
  localStorage.setItem(recordKey, JSON.stringify(envelope));

  const ids = listStoredSessions(session.owner);

  if (!ids.includes(session.mandatePda)) {
    localStorage.setItem(
      indexKey(session.owner),
      JSON.stringify([...ids, session.mandatePda]),
    );
  }
}

export async function restoreEncryptedSession(args: {
  passphrase: string;
  owner: string;
  mandatePda: string;
}): Promise<{ session: StoredSession; keypair: Keypair }> {
  const { passphrase, owner, mandatePda } = args;

  assertBrowser();
  validatePassphrase(passphrase);

  const raw = localStorage.getItem(storageKey(owner, mandatePda));

  if (!raw) {
    throw new Error("No encrypted session data was found.");
  }

  let parsedEnvelope: unknown;

  try {
    parsedEnvelope = JSON.parse(raw);
  } catch {
    throw new Error("The stored session data is not valid JSON.");
  }

  if (!isEnvelope(parsedEnvelope)) {
    throw new Error("The session data format is invalid.");
  }

  const salt = fromBase64(parsedEnvelope.salt);
  const iv = fromBase64(parsedEnvelope.iv);
  const ciphertext = fromBase64(parsedEnvelope.ciphertext);

  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) {
    throw new Error("The encrypted session data is corrupted or incomplete.");
  }

  const key = await deriveKey(passphrase, salt);

  let plaintextBuffer: ArrayBuffer;

  try {
    plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext,
    );
  } catch {
    throw new Error("The passphrase is incorrect or the session data is corrupted.");
  }

  let session: StoredSession;

  try {
    session = JSON.parse(
      new TextDecoder().decode(plaintextBuffer),
    ) as StoredSession;
  } catch {
    throw new Error("The session data contents are invalid.");
  }

  if (
    !session ||
    session.owner !== owner ||
    session.mandatePda !== mandatePda ||
    typeof session.id !== "string" ||
    typeof session.mint !== "string" ||
    typeof session.recipient !== "string" ||
    typeof session.maxPerAction !== "string" ||
    typeof session.maxTotal !== "string" ||
    typeof session.sessionPublicKey !== "string" ||
    !Array.isArray(session.secretKey) ||
    session.secretKey.length !== 64 ||
    !session.secretKey.every(
      (byte) =>
        Number.isInteger(byte) &&
        byte >= 0 &&
        byte <= 255,
    )
  ) {
    throw new Error(
      "The session data does not match the wallet or mandate.",
    );
  }

  let keypair: Keypair;

  try {
    keypair = Keypair.fromSecretKey(
      Uint8Array.from(session.secretKey),
    );
  } catch {
    throw new Error("The stored secret key is invalid.");
  }

  if (keypair.publicKey.toBase58() !== session.sessionPublicKey) {
    throw new Error("The session key does not match the public key.");
  }

  return { session, keypair };
}

export function deleteEncryptedSession(
  owner: string,
  mandatePda: string,
): void {
  assertBrowser();

  localStorage.removeItem(storageKey(owner, mandatePda));

  const ids = listStoredSessions(owner).filter(
    (id) => id !== mandatePda,
  );

  if (ids.length > 0) {
    localStorage.setItem(indexKey(owner), JSON.stringify(ids));
  } else {
    localStorage.removeItem(indexKey(owner));
  }
}
