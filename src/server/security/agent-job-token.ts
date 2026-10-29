import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { ApiErrors } from "../api/errors";
import { getServerEnv } from "../env";

function getSecret(): string {
  const secret = getServerEnv().WORKER_API_SECRET;
  if (!secret) {
    throw new Error("WORKER_API_SECRET must be configured for agent jobs.");
  }
  return secret;
}

export function createAgentJobToken(
  owner: string,
  mandateId: string,
  requestId: string,
): string {
  return createHmac("sha256", getSecret())
    .update(`${owner}:${mandateId}:${requestId}`)
    .digest("hex");
}

export function hashAgentJobToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function authorizeWorkerRequest(header: string | null): void {
  const match = /^Bearer ([\w-]{32,128})$/.exec(header ?? "");
  const expected = getSecret();
  const actual = match?.[1] ?? "";
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw ApiErrors.unauthenticated("Invalid worker credentials");
  }
}

export function isAgentJobTokenValid(
  token: string,
  storedHash: string,
): boolean {
  const actual = Buffer.from(hashAgentJobToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
