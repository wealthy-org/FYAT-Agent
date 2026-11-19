import { env } from "@/lib/env";

export type SolanaNetwork = typeof env.NEXT_PUBLIC_SOLANA_NETWORK;

export const NETWORK = env.NEXT_PUBLIC_SOLANA_NETWORK;
export const IS_MAINNET = NETWORK === "mainnet-beta";
export const IS_DEVNET = NETWORK === "devnet";

export const NETWORK_LABELS: Record<SolanaNetwork, string> = {
  devnet: "Solana Devnet",
  "mainnet-beta": "Solana Mainnet",
  localnet: "Solana Localnet",
};

/** Nama pendek untuk teks UI: "Devnet" / "Mainnet" / "Localnet". */
export const NETWORK_NAME = NETWORK_LABELS[NETWORK].replace("Solana ", "");

export const NETWORK_DISCLAIMER = IS_MAINNET
  ? "FYAT Agent on Solana Mainnet: transactions move real funds. Only deposit what you can afford to lose."
  : `FYAT Agent is a ${NETWORK_NAME} prototype: unaudited, no token, no real funds.`;
