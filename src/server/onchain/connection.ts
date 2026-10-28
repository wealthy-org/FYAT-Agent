import "server-only";

import { Connection } from "@solana/web3.js";

import { getServerEnv } from "../env";

let cached: Connection | undefined;

export function getConnection(): Connection {
  cached ??= new Connection(getServerEnv().SOLANA_RPC_URL, "confirmed");
  return cached;
}