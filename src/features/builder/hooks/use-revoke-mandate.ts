"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { signedJsonRequest } from "@/lib/client-signed-request";
import { env } from "@/lib/env";
import { createFyatProgram } from "@/lib/fyat-program";
import { FYAT_PROGRAM_ID } from "@/lib/program-id";
import { findVaultPda } from "@/lib/vault-address";

import { confirmOrThrow, toErrorMessage } from "../lib/onchain-helpers";

export function useRevokeMandate() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");

  /**
   * @param mandateId  UUID baris di database (untuk route API)
   * @param mandatePda alamat akun mandate di chain
   */
  const revoke = useCallback(
    async (mandateId: string, mandatePda: string): Promise<boolean> => {
      setBusy(true);
      setError("");
      setSignature("");

      try {
        if (!wallet.publicKey) {
          throw new Error("Connect your wallet first.");
        }
        if (!env.NEXT_PUBLIC_TOKEN_MINT) {
          throw new Error("NEXT_PUBLIC_TOKEN_MINT is not configured.");
        }

        const owner = wallet.publicKey;
        const vault = new PublicKey(
          findVaultPda({
            owner: owner.toBase58(),
            mint: env.NEXT_PUBLIC_TOKEN_MINT,
            programId: FYAT_PROGRAM_ID,
          }),
        );

        const program = createFyatProgram(connection, wallet);

        setStatus("Approve the revocation in your wallet...");
        const revokeSignature = await program.methods
          .revokeMandate()
          .accountsPartial({
            owner,
            vault,
            mandate: new PublicKey(mandatePda),
          })
          .rpc();

        setStatus("Waiting for confirmation...");
        await confirmOrThrow(
          connection,
          revokeSignature,
          "The mandate revocation failed to confirm.",
        );
        setSignature(revokeSignature);

        setStatus("Recording the revocation in the app...");
        await signedJsonRequest(
          wallet,
          `/api/mandates/${mandateId}/revoke`,
          "POST",
          { revokeSignature },
        );

        setStatus("Mandate revoked successfully.");
        return true;
      } catch (e) {
        setError(toErrorMessage(e));
        setStatus("");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [connection, wallet],
  );

  return { busy, status, error, signature, revoke };
}