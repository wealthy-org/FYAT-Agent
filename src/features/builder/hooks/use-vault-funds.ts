"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

import { parseUnits } from "@/lib/amount";
import { env } from "@/lib/env";
import { createFyatProgram } from "@/lib/fyat-program";
import { FYAT_PROGRAM_ID } from "@/lib/program-id";
import { findVaultPda } from "@/lib/vault-address";

import { USDC_DECIMALS } from "../constants";
import { confirmOrThrow, toErrorMessage } from "../lib/onchain-helpers";

type Balances = { vault: bigint; wallet: bigint };

export function useVaultFunds() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [balances, setBalances] = useState<Balances | null>(null);

  /** Alamat-alamat yang dibutuhkan deposit, withdraw, dan pembacaan saldo. */
  const resolveAddresses = useCallback(() => {
    if (!wallet.publicKey) {
      throw new Error("Connect your wallet first.");
    }
    if (!env.NEXT_PUBLIC_TOKEN_MINT) {
      throw new Error("NEXT_PUBLIC_TOKEN_MINT is not configured.");
    }

    const owner = wallet.publicKey;
    const mint = new PublicKey(env.NEXT_PUBLIC_TOKEN_MINT);
    const vault = new PublicKey(
      findVaultPda({
        owner: owner.toBase58(),
        mint: mint.toBase58(),
        programId: FYAT_PROGRAM_ID,
      }),
    );
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      mint,
      vault,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    return { owner, mint, vault, vaultTokenAccount, ownerTokenAccount };
  }, [wallet.publicKey]);

  const refreshBalances = useCallback(async () => {
    try {
      const a = resolveAddresses();
      const read = async (address: PublicKey): Promise<bigint> => {
        try {
          return (await getAccount(connection, address, "confirmed")).amount;
        } catch {
          return 0n; // akun token belum ada
        }
      };
      setBalances({
        vault: await read(a.vaultTokenAccount),
        wallet: await read(a.ownerTokenAccount),
      });
    } catch {
      setBalances(null);
    }
  }, [connection, resolveAddresses]);

  const run = useCallback(
    async (
      kind: "deposit" | "withdraw",
      amountText: string,
    ): Promise<string | null> => {
      setBusy(true);
      setError("");
      setSignature("");

      try {
        const amount = parseUnits(amountText.trim(), USDC_DECIMALS);
        if (amount <= 0n) throw new Error("The amount must be greater than 0.");

        const a = resolveAddresses();
        const program = createFyatProgram(connection, wallet);

        const vaultInfo = await connection.getAccountInfo(a.vault, "confirmed");
        if (!vaultInfo) {
          throw new Error("The vault has not been created. Create your first mandate first.");
        }

        setStatus(
          kind === "deposit"
            ? "Approve the deposit in your wallet..."
            : "Approve the withdrawal in your wallet...",
        );

        // Token account owner dibuat bila belum ada (idempoten).
        const ensureOwnerAta =
          createAssociatedTokenAccountIdempotentInstruction(
            a.owner,
            a.ownerTokenAccount,
            a.owner,
            a.mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          );

        const builder =
          kind === "deposit"
            ? program.methods.deposit(new BN(amount.toString()))
            : program.methods.withdraw(new BN(amount.toString()));

        const txSignature = await builder
          .accountsPartial({
            owner: a.owner,
            vault: a.vault,
            mint: a.mint,
            ownerTokenAccount: a.ownerTokenAccount,
            vaultTokenAccount: a.vaultTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .preInstructions([ensureOwnerAta])
          .rpc();

        setStatus("Waiting for confirmation...");
        await confirmOrThrow(
          connection,
          txSignature,
          kind === "deposit" ? "The deposit failed to confirm." : "The withdrawal failed to confirm.",
        );

        setSignature(txSignature);
        setStatus(kind === "deposit" ? "Deposit successful." : "Withdrawal successful.");
        await refreshBalances();
        return txSignature;
      } catch (e) {
        setError(toErrorMessage(e));
        setStatus("");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [connection, wallet, resolveAddresses, refreshBalances],
  );

  return {
    busy,
    status,
    error,
    signature,
    balances,
    refreshBalances,
    deposit: (amount: string) => run("deposit", amount),
    withdraw: (amount: string) => run("withdraw", amount),
  };
}