"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { signedJsonRequest } from "@/lib/client-signed-request";

type FaucetResponse = {
  signature: string;
  solAmount: number;
  tokenAmount: number;
};

export function useFaucetClaim(onClaimed?: () => void) {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<FaucetResponse | null>(null);

  async function claim() {
    if (!publicKey) {
      setError("Connect your Solana wallet before claiming test funds.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("Sending Devnet SOL and test USDC...");
    setResult(null);

    try {
      const body: unknown = await signedJsonRequest<FaucetResponse>(
        wallet,
        "/api/faucet",
        "POST",
        {},
      );
      if (
        typeof body !== "object" ||
        body === null ||
        !("signature" in body) ||
        typeof body.signature !== "string" ||
        !("solAmount" in body) ||
        typeof body.solAmount !== "number" ||
        !("tokenAmount" in body) ||
        typeof body.tokenAmount !== "number"
      ) {
        throw new Error("The faucet returned an invalid transaction receipt.");
      }

      const claimed = {
        signature: body.signature,
        solAmount: body.solAmount,
        tokenAmount: body.tokenAmount,
      };
      setResult(claimed);
      setStatus(
        `Claim confirmed: ${claimed.solAmount} SOL and ${claimed.tokenAmount} test USDC.`,
      );
      onClaimed?.();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Faucet request failed.",
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return {
    claim,
    busy,
    status,
    error,
    result,
    walletConnected: !!publicKey,
    supportsMessageSigning: !!wallet.signMessage,
  };
}
