import { PublicKey } from "@solana/web3.js";
import { env } from "./env";

const EXPLORER_BASE_URL = "https://explorer.solana.com";

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

function clusterQuery(): string {
  if (env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet") return "?cluster=devnet";

  const customUrl = encodeURIComponent(env.NEXT_PUBLIC_SOLANA_RPC_URL);
  return `?cluster=custom&customUrl=${customUrl}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/address/${encodeURIComponent(address)}${clusterQuery()}`;
}

export function explorerTxUrl(signature: string): string {
  return `${EXPLORER_BASE_URL}/tx/${encodeURIComponent(signature)}${clusterQuery()}`;
}

/** True jika `value` adalah public key Solana yang valid (Base58, 32 byte). */
export function isValidSolanaAddress(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}