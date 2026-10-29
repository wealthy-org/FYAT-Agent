"use client";

import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";

import idlJson from "@/lib/idl/fyat_mandate.json";
import type { FyatMandate } from "@/lib/idl/fyat_mandate.types";

const COMMITMENT = "confirmed" as const;

export function createFyatProgram(
  connection: Connection,
  connectedWallet: WalletContextState,
): Program<FyatMandate> {
  if (
    !connectedWallet.publicKey ||
    !connectedWallet.signTransaction ||
    !connectedWallet.signAllTransactions
  ) {
    throw new Error(
      "Connect a wallet that supports transaction signing first.",
    );
  }

  const wallet = connectedWallet as unknown as Wallet;
  const provider = new AnchorProvider(connection, wallet, {
    commitment: COMMITMENT,
    preflightCommitment: COMMITMENT,
  });

  return new Program<FyatMandate>(idlJson as FyatMandate, provider);
}