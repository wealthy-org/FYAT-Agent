import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
} from "node:crypto";

import { PublicKey } from "@solana/web3.js";

import { AUTH_HEADERS, buildAuthMessage } from "../src/lib/auth-message";

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000";
const DOMAIN = new URL(BASE_URL).host;

type TestWallet = { address: string; privateKey: KeyObject };
type SignedRequest = { headers: Record<string, string>; body: string };
type ApiResult = { status: number; body: unknown };

type SignOptions = {
  nonce?: string;
  issuedAt?: string;
  /** Body yang di-hash untuk signature, jika sengaja berbeda dari body yang dikirim. */
  signedBody?: string;
};

function createWallet(): TestWallet {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const x = publicKey.export({ format: "jwk" }).x;
  if (!x) throw new Error("Could not export the public key");

  return {
    address: new PublicKey(Buffer.from(x, "base64url")).toBase58(),
    privateKey,
  };
}

function buildSigned(
  wallet: TestWallet,
  path: string,
  body: string,
  options: SignOptions = {},
): SignedRequest {
  const nonce = options.nonce ?? randomBytes(16).toString("hex");
  const issuedAt = options.issuedAt ?? new Date().toISOString();

  const message = buildAuthMessage({
    domain: DOMAIN,
    wallet: wallet.address,
    method: "POST",
    path,
    bodyHash: createHash("sha256")
      .update(options.signedBody ?? body, "utf8")
      .digest("hex"),
    nonce,
    issuedAt,
  });

  const signature = sign(
    null,
    Buffer.from(message, "utf8"),
    wallet.privateKey,
  ).toString("base64");

  return {
    body,
    headers: {
      "content-type": "application/json",
      [AUTH_HEADERS.wallet]: wallet.address,
      [AUTH_HEADERS.signature]: signature,
      [AUTH_HEADERS.nonce]: nonce,
      [AUTH_HEADERS.issuedAt]: issuedAt,
    },
  };
}

async function send(path: string, request: SignedRequest): Promise<ApiResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

let failures = 0;

function expectStatus(name: string, result: ApiResult, expected: number): void {
  const passed = result.status === expected;
  if (!passed) failures += 1;

  console.log(
    `${passed ? "✓" : "✗"} ${name} → ${result.status} (expected ${expected})`,
  );
  if (!passed) console.log("   ", JSON.stringify(result.body));
}

async function main(): Promise<void> {
  const owner = createWallet();
  const stranger = createWallet();
  const agent = createWallet();

  console.log(`Target: ${BASE_URL}\n`);

  const empty = "{}";
  const mandateBody = JSON.stringify({
    sessionPubkey: agent.address,
    config: {
      action: "SWAP",
      venue: "METEORA_DAMM",
      recipient: "",
      maxPerAction: "5",
      maxTotal: "50",
      expiresInHours: "24",
    },
  });

  // --- Vault -------------------------------------------------------------
  const unsigned = await send("/api/vaults", {
    body: empty,
    headers: { "content-type": "application/json" },
  });
  expectStatus("Unsigned request is rejected", unsigned, 401);

  expectStatus(
    "Create vault",
    await send("/api/vaults", buildSigned(owner, "/api/vaults", empty)),
    201,
  );
  expectStatus(
    "Create vault again (idempotent)",
    await send("/api/vaults", buildSigned(owner, "/api/vaults", empty)),
    200,
  );

  // --- Mandate -----------------------------------------------------------
  expectStatus(
    "Mandate without a vault is rejected",
    await send(
      "/api/mandates",
      buildSigned(stranger, "/api/mandates", mandateBody),
    ),
    404,
  );

  const created = await send(
    "/api/mandates",
    buildSigned(owner, "/api/mandates", mandateBody),
  );
  expectStatus("Create mandate", created, 201);

  const mandateId = (created.body as { mandate?: { id?: string } } | null)
    ?.mandate?.id;
  if (!mandateId) throw new Error("Mandate was not created; cannot continue.");

  const invalidBody = JSON.stringify({
    sessionPubkey: agent.address,
    config: {
      action: "SWAP",
      venue: "METEORA_DAMM",
      recipient: "",
      maxPerAction: "100",
      maxTotal: "50",
      expiresInHours: "24",
    },
  });
  expectStatus(
    "Per-action cap above total budget is rejected",
    await send(
      "/api/mandates",
      buildSigned(owner, "/api/mandates", invalidBody),
    ),
    400,
  );

  // --- Serangan terhadap autentikasi ------------------------------------
  const replayable = buildSigned(owner, "/api/mandates", mandateBody);
  expectStatus("First use of a signed request", await send("/api/mandates", replayable), 201);
  expectStatus("Replaying the same signed request", await send("/api/mandates", replayable), 401);

  expectStatus(
    "Tampered body (signature covers a different body)",
    await send(
      "/api/mandates",
      buildSigned(owner, "/api/mandates", mandateBody, {
        signedBody: invalidBody,
      }),
    ),
    401,
  );

  expectStatus(
    "Stale signature (10 minutes old)",
    await send(
      "/api/vaults",
      buildSigned(owner, "/api/vaults", empty, {
        issuedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      }),
    ),
    401,
  );

  expectStatus(
    "Signature for another path cannot be reused",
    await send(
      "/api/vaults",
      buildSigned(owner, "/api/mandates", empty),
    ),
    401,
  );

  // --- Revoke ------------------------------------------------------------
  const revokePath = `/api/mandates/${mandateId}/revoke`;

  expectStatus(
    "Another wallet cannot revoke",
    await send(revokePath, buildSigned(stranger, revokePath, empty)),
    404,
  );
  expectStatus(
    "Owner revokes",
    await send(revokePath, buildSigned(owner, revokePath, empty)),
    200,
  );
  expectStatus(
    "Revoking twice is refused",
    await send(revokePath, buildSigned(owner, revokePath, empty)),
    404,
  );

  console.log(
    failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});