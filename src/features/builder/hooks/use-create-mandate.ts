"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

import { env } from "@/lib/env";
import { createFyatProgram } from "@/lib/fyat-program";
import { findVaultPda } from "@/lib/vault-address";
import { findMandatePda } from "@/lib/mandate-address";
import { signedJsonRequest } from "@/lib/client-signed-request";
import type { MandateConfig } from "../types";
import { formatUnits } from "@/lib/amount";
import { USDC_DECIMALS } from "@/features/builder/constants";
import {
  MIN_PASSPHRASE_LENGTH,
  isPassphraseValid,
  listStoredSessions,
  restoreEncryptedSession,
  saveEncryptedSession,
} from "../lib/session-vault";
import { FYAT_PROGRAM_ID } from "@/lib/program-id";
import { getSwapConfig } from "@/lib/swap-config";
import {
  buildExecuteSwapInstructions,
  fetchConfiguredSwapPool,
} from "../simulation/build-swap";
import type { ActiveMandate } from "../mandate-creator-types";

const PROGRAM_ID = new PublicKey(FYAT_PROGRAM_ID);

type CreateResponse = {
  mandate?: { id?: string };
  id?: string;
};

export type { ActiveMandate } from "../mandate-creator-types";

export function useCreateMandate() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [sessionKey, setSessionKey] = useState<Keypair | null>(null);
  const [externalAgent, setExternalAgent] = useState("");
  const [activeMandate, setActiveMandate] = useState<ActiveMandate | null>(
    null,
  );
  const [storedSessions, setStoredSessions] = useState<string[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);

  const refreshStoredSessions = useCallback(() => {
    if (!wallet.publicKey) {
      setStoredSessions([]);
      return;
    }

    setStoredSessions(listStoredSessions(wallet.publicKey.toBase58()));
  }, [wallet.publicKey]);

  const create = useCallback(
    async (config: MandateConfig, agentPubkey?: string) => {
      if (
        !wallet.publicKey ||
        !wallet.signTransaction ||
        !wallet.signAllTransactions ||
        !wallet.signMessage
      ) {
        throw new Error(
          "Connect a wallet that supports transactions and message signing first.",
        );
      }

      setBusy(true);
      setError("");
      setStatus("Checking vault...");
      setSignature("");

      try {
        const mintValue = env.NEXT_PUBLIC_TOKEN_MINT;

        if (!mintValue) {
          throw new Error("NEXT_PUBLIC_TOKEN_MINT is not configured.");
        }

        const mint = new PublicKey(mintValue);
        const owner = wallet.publicKey;
        const swapConfig = config.action === "SWAP" ? getSwapConfig() : null;
        if (config.action === "SWAP" && !swapConfig) {
          throw new Error(
            "Swap is not configured. Set NEXT_PUBLIC_DAMM_POOL and NEXT_PUBLIC_SWAP_OUTPUT_MINT.",
          );
        }
        const target =
          config.action === "TRANSFER" ? config.recipient : swapConfig?.pool;
        if (!target) {
          throw new Error("The approved Meteora DAMM pool is not configured.");
        }
        if (config.action === "SWAP") {
          await fetchConfiguredSwapPool(connection, swapConfig);
        }
        const recipient = new PublicKey(target);

        // Opsional: session key milik agent. Kosong = mode demo (kunci dibuat di browser).
        const externalKey = agentPubkey?.trim()
          ? new PublicKey(agentPubkey.trim())
          : null;
        if (externalKey && externalKey.equals(owner)) {
          throw new Error(
            "The session key must not be the same as the owner's key.",
          );
        }

        const vaultAddress = new PublicKey(
          findVaultPda({
            owner: owner.toBase58(),
            mint: mint.toBase58(),
            programId: PROGRAM_ID.toBase58(),
          }),
        );

        const vaultTokenAccount = getAssociatedTokenAddressSync(
          mint,
          vaultAddress,
          true,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        const program = createFyatProgram(connection, wallet);
        const vaultInfo = await connection.getAccountInfo(
          vaultAddress,
          "confirmed",
        );

        if (!vaultInfo) {
          setStatus("Approve vault creation in your wallet...");

          const initSignature = await program.methods
            .initializeVault()
            .accountsPartial({
              owner,
              mint,
              vault: vaultAddress,
              vaultTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc();

          const initConfirmation = await connection.confirmTransaction(
            initSignature,
            "confirmed",
          );

          if (initConfirmation.value.err) {
            throw new Error("Vault creation failed to confirm.");
          }

          setSignature(initSignature);
        }

        setStatus("Verifying vault on-chain...");

        const vaultAccount = await program.account.vault.fetch(vaultAddress);

        if (
          !vaultAccount.owner.equals(owner) ||
          !vaultAccount.mint.equals(mint)
        ) {
          throw new Error(
            "The on-chain vault does not match the connected wallet or token mint.",
          );
        }

        setStatus("Registering vault with the app...");

        await signedJsonRequest<{ vault: { id: string } }>(
          wallet,
          "/api/vaults",
          "POST",
          {},
        );

        const mandateNumber = BigInt(vaultAccount.nextMandateId.toString());

        const generated = externalKey ? null : Keypair.generate();
        const sessionPublicKey: PublicKey =
          externalKey ?? (generated as Keypair).publicKey;

        const mandateAddress = new PublicKey(
          findMandatePda({
            vault: vaultAddress.toBase58(),
            id: mandateNumber,
            programId: PROGRAM_ID.toBase58(),
          }),
        );

        const expiresAt =
          Math.floor(Date.now() / 1000) + config.expiresInHours * 60 * 60;

        setStatus("Approve mandate creation in your wallet...");

        const createParams = {
          session: sessionPublicKey,
          recipient,
          maxPerAction: new BN(config.maxPerAction.toString()),
          maxTotal: new BN(config.maxTotal.toString()),
          expiresAt: new BN(expiresAt.toString()),
        };
        const createBuilder =
          config.action === "TRANSFER"
            ? program.methods.createMandate(createParams)
            : program.methods.createSwapMandate(createParams);
        const createSignature = await createBuilder
          .accountsPartial({
            owner,
            vault: vaultAddress,
            mandate: mandateAddress,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const createConfirmation = await connection.confirmTransaction(
          createSignature,
          "confirmed",
        );

        if (createConfirmation.value.err) {
          throw new Error("Mandate creation failed to confirm.");
        }

        setSignature(createSignature);
        setStatus("Registering mandate with the app...");

        const response = await signedJsonRequest<CreateResponse>(
          wallet,
          "/api/mandates",
          "POST",
          {
            sessionPubkey: sessionPublicKey.toBase58(),
            config:
              config.action === "TRANSFER"
                ? {
                    action: config.action,
                    recipient: recipient.toBase58(),
                    maxPerAction: formatUnits(
                      config.maxPerAction,
                      USDC_DECIMALS,
                    ),
                    maxTotal: formatUnits(config.maxTotal, USDC_DECIMALS),
                    expiresInHours: String(config.expiresInHours),
                  }
                : {
                    action: config.action,
                    venue: config.venue,
                    maxPerAction: formatUnits(
                      config.maxPerAction,
                      USDC_DECIMALS,
                    ),
                    maxTotal: formatUnits(config.maxTotal, USDC_DECIMALS),
                    expiresInHours: String(config.expiresInHours),
                  },
            mandatePda: mandateAddress.toBase58(),
            createSignature,
          },
        );

        const dbMandateId = response.mandate?.id ?? response.id;

        if (!dbMandateId) {
          throw new Error(
            "The mandate was created on-chain, but its API ID was not found. Do not create another mandate.",
          );
        }

        const nextMandate: ActiveMandate = {
          id: dbMandateId,
          mandatePda: mandateAddress.toBase58(),
          owner: owner.toBase58(),
          mint: mint.toBase58(),
          action: config.action,
          recipient: recipient.toBase58(),
          maxPerAction: config.maxPerAction,
          maxTotal: config.maxTotal,
        };

        setSessionKey(generated);
        setExternalAgent(externalKey ? externalKey.toBase58() : "");
        setActiveMandate(nextMandate);
        refreshStoredSessions();

        setStatus(`Mandate created on-chain: ${mandateAddress.toBase58()}`);

        return {
          id: dbMandateId,
          signature: createSignature,
          mandatePda: mandateAddress.toBase58(),
          sessionPubkey: sessionPublicKey.toBase58(),
          response,
        };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Transaction failed.";

        setError(message);
        setStatus("");
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [connection, wallet, refreshStoredSessions],
  );

  const saveSession = useCallback(
    async (passphrase: string) => {
      if (!wallet.publicKey) {
        throw new Error("Connect the mandate owner's wallet.");
      }

      if (!sessionKey || !activeMandate) {
        throw new Error("There is no active session to save.");
      }

      if (wallet.publicKey.toBase58() !== activeMandate.owner) {
        throw new Error("The connected wallet does not own this mandate.");
      }

      if (!isPassphraseValid(passphrase)) {
        throw new Error(
          `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`,
        );
      }

      setSessionBusy(true);
      setError("");
      setStatus("Encrypting and saving session...");

      try {
        const storedSession = {
          id: activeMandate.id,
          owner: activeMandate.owner,
          mandatePda: activeMandate.mandatePda,
          mint: activeMandate.mint,
          recipient: activeMandate.recipient,
          action: activeMandate.action,
          maxPerAction: activeMandate.maxPerAction.toString(),
          maxTotal: activeMandate.maxTotal.toString(),
          sessionPublicKey: sessionKey.publicKey.toBase58(),
          secretKey: Array.from(sessionKey.secretKey),
        };

        await saveEncryptedSession({ passphrase, session: storedSession });

        refreshStoredSessions();
        setStatus("Encrypted session saved successfully.");
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Failed to save session.";

        setError(message);
        setStatus("");
        throw cause;
      } finally {
        setSessionBusy(false);
      }
    },
    [activeMandate, refreshStoredSessions, sessionKey, wallet.publicKey],
  );

  const restoreSession = useCallback(
    async (mandatePda: string, passphrase: string) => {
      if (!wallet.publicKey) {
        throw new Error("Connect the mandate owner's wallet.");
      }

      if (!isPassphraseValid(passphrase)) {
        throw new Error(
          `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`,
        );
      }

      const normalizedPda = new PublicKey(mandatePda.trim()).toBase58();

      setSessionBusy(true);
      setError("");
      setStatus("Opening encrypted session...");

      try {
        const restored = await restoreEncryptedSession({
          passphrase,
          owner: wallet.publicKey.toBase58(),
          mandatePda: normalizedPda,
        });

        const restoredKeypair = restored.keypair;
        const mintValue = env.NEXT_PUBLIC_TOKEN_MINT;

        if (!mintValue) {
          throw new Error("NEXT_PUBLIC_TOKEN_MINT is not configured.");
        }

        const owner = wallet.publicKey;
        const mint = new PublicKey(mintValue);
        const mandate = new PublicKey(normalizedPda);

        const vault = new PublicKey(
          findVaultPda({
            owner: owner.toBase58(),
            mint: mint.toBase58(),
            programId: PROGRAM_ID.toBase58(),
          }),
        );

        const program = createFyatProgram(connection, wallet);

        const [vaultAccount, mandateAccount] = await Promise.all([
          program.account.vault.fetch(vault),
          program.account.mandate.fetch(mandate),
        ]);

        if (
          !vaultAccount.owner.equals(owner) ||
          !vaultAccount.mint.equals(mint)
        ) {
          throw new Error(
            "The on-chain vault does not match the connected wallet.",
          );
        }

        if (
          !mandateAccount.vault.equals(vault) ||
          !mandateAccount.session.equals(restoredKeypair.publicKey)
        ) {
          throw new Error(
            "The session key or vault does not match the on-chain mandate.",
          );
        }

        if (mandateAccount.revokedAt.toString() !== "0") {
          throw new Error("This mandate has already been revoked.");
        }

        if (
          Number(mandateAccount.expiresAt.toString()) <=
          Math.floor(Date.now() / 1000)
        ) {
          throw new Error("This mandate has expired.");
        }

        const restoredMandate: ActiveMandate = {
          id: restored.session.id,
          mandatePda: normalizedPda,
          owner: owner.toBase58(),
          mint: mint.toBase58(),
          action: "swap" in mandateAccount.action ? "SWAP" : "TRANSFER",
          recipient: mandateAccount.recipient.toBase58(),
          maxPerAction: BigInt(mandateAccount.maxPerAction.toString()),
          maxTotal: BigInt(mandateAccount.maxTotal.toString()),
        };

        setSessionKey(restoredKeypair);
        setExternalAgent("");
        setActiveMandate(restoredMandate);
        setStatus(`Session restored: ${normalizedPda}`);

        return restoredMandate;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Failed to restore session.";

        setError(message);
        setStatus("");
        throw cause;
      } finally {
        setSessionBusy(false);
      }
    },
    [connection, wallet],
  );

  const execute = useCallback(
    async (amount: bigint) => {
      if (
        !wallet.publicKey ||
        !wallet.signTransaction ||
        !wallet.signAllTransactions ||
        !wallet.signMessage
      ) {
        throw new Error("Connect the mandate owner's wallet first.");
      }

      if (!sessionKey || !activeMandate) {
        if (externalAgent && activeMandate) {
          if (externalAgent !== env.NEXT_PUBLIC_AGENT_SESSION_PUBKEY) {
            throw new Error(
              "This session key is not assigned to the configured Railway worker.",
            );
          }
        } else {
          throw new Error(
            "The active session key or mandate is unavailable. Restore the correct session first.",
          );
        }
      }

      if (!activeMandate) {
        throw new Error("The active mandate is unavailable.");
      }

      if (wallet.publicKey.toBase58() !== activeMandate.owner) {
        throw new Error("The connected wallet does not own this mandate.");
      }

      if (amount <= 0n) {
        throw new Error("The action amount must be greater than zero.");
      }

      if (amount > activeMandate.maxPerAction) {
        throw new Error(
          "The amount exceeds the mandate's per-transaction limit.",
        );
      }

      setBusy(true);
      setError("");
      setStatus("Checking the mandate and vault balance...");

      try {
        if (!sessionKey) {
          const queued = await signedJsonRequest<{
            jobId: string;
            token: string;
            status:
              "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
          }>(
            wallet,
            `/api/mandates/${encodeURIComponent(activeMandate.id)}/jobs`,
            "POST",
            { requestId: crypto.randomUUID(), amount: amount.toString() },
          );
          setStatus("Queued for the Railway agent worker...");

          for (let attempt = 0; attempt < 200; attempt += 1) {
            const response = await fetch(
              `/api/agent-jobs/${encodeURIComponent(queued.jobId)}`,
              { headers: { Authorization: `Bearer ${queued.token}` } },
            );
            const result: unknown = await response.json().catch(() => null);
            if (!response.ok) {
              const message =
                typeof result === "object" &&
                result !== null &&
                "error" in result &&
                typeof result.error === "object" &&
                result.error !== null &&
                "message" in result.error &&
                typeof result.error.message === "string"
                  ? result.error.message
                  : `Could not read agent job status (HTTP ${response.status}).`;
              throw new Error(message);
            }

            const job =
              typeof result === "object" && result !== null && "job" in result
                ? result.job
                : null;
            if (
              typeof job !== "object" ||
              job === null ||
              !("status" in job) ||
              typeof job.status !== "string"
            ) {
              throw new Error(
                "The agent worker returned an invalid job status.",
              );
            }
            if (job.status === "SUCCEEDED") {
              if (
                !("txSignature" in job) ||
                typeof job.txSignature !== "string"
              ) {
                throw new Error(
                  "The agent job succeeded without a transaction signature.",
                );
              }
              setSignature(job.txSignature);
              setStatus(`Execution successful: ${job.txSignature}`);
              return job.txSignature;
            }
            if (job.status === "FAILED" || job.status === "UNKNOWN") {
              const message =
                "error" in job && typeof job.error === "string"
                  ? job.error
                  : `The agent job ended with status ${job.status}.`;
              throw new Error(message);
            }

            setStatus(
              job.status === "PROCESSING"
                ? "The Railway agent is processing the transaction..."
                : "Waiting for the Railway agent worker...",
            );
            await new Promise((resolve) => window.setTimeout(resolve, 3_000));
          }

          throw new Error(
            "The agent job is still pending. Check its status before submitting another execution.",
          );
        }

        const mint = new PublicKey(activeMandate.mint);
        const owner = new PublicKey(activeMandate.owner);
        const recipient = new PublicKey(activeMandate.recipient);
        const mandate = new PublicKey(activeMandate.mandatePda);

        const vault = new PublicKey(
          findVaultPda({
            owner: owner.toBase58(),
            mint: mint.toBase58(),
            programId: PROGRAM_ID.toBase58(),
          }),
        );

        const vaultTokenAccount = getAssociatedTokenAddressSync(
          mint,
          vault,
          true,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        const program = createFyatProgram(connection, wallet);

        const [vaultAccount, mandateAccount] = await Promise.all([
          program.account.vault.fetch(vault),
          program.account.mandate.fetch(mandate),
        ]);

        if (
          !vaultAccount.owner.equals(owner) ||
          !vaultAccount.mint.equals(mint)
        ) {
          throw new Error("The on-chain vault data does not match.");
        }

        if (
          !mandateAccount.vault.equals(vault) ||
          !mandateAccount.session.equals(sessionKey.publicKey) ||
          !mandateAccount.recipient.equals(recipient)
        ) {
          throw new Error(
            "The mandate, session key, or recipient does not match the on-chain data.",
          );
        }

        if (mandateAccount.revokedAt.toString() !== "0") {
          throw new Error("The mandate has been revoked.");
        }

        if (
          Number(mandateAccount.expiresAt.toString()) <=
          Math.floor(Date.now() / 1000)
        ) {
          throw new Error("The mandate has expired.");
        }

        const onchainMaxPerAction = BigInt(
          mandateAccount.maxPerAction.toString(),
        );
        const onchainMaxTotal = BigInt(mandateAccount.maxTotal.toString());
        const onchainSpent = BigInt(mandateAccount.spent.toString());

        if (amount > onchainMaxPerAction) {
          throw new Error("The amount exceeds the on-chain per-action limit.");
        }

        if (onchainSpent + amount > onchainMaxTotal) {
          throw new Error("The amount exceeds the mandate's remaining budget.");
        }

        const balance = await connection.getTokenAccountBalance(
          vaultTokenAccount,
          "confirmed",
        );

        if (BigInt(balance.value.amount) < amount) {
          throw new Error(
            "The vault does not have enough USDC. Deposit funds into the vault first.",
          );
        }

        setStatus(
          "Approve the transaction fee in your wallet. The session key will sign the instruction.",
        );

        let txSignature: string;
        if (activeMandate.action === "TRANSFER") {
          const destinationTokenAccount = getAssociatedTokenAddressSync(
            mint,
            recipient,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          );
          const destinationInfo = await connection.getAccountInfo(
            destinationTokenAccount,
            "confirmed",
          );
          if (!destinationInfo) {
            throw new Error(
              "The recipient's token account does not exist. Create the recipient's ATA before executing.",
            );
          }

          txSignature = await program.methods
            .executeTransfer(new BN(amount.toString()))
            .accountsPartial({
              session: sessionKey.publicKey,
              vault,
              mandate,
              mint,
              vaultTokenAccount,
              destinationTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([sessionKey])
            .rpc();
        } else {
          const { instructions } = await buildExecuteSwapInstructions({
            connection,
            program,
            payer: owner,
            session: sessionKey.publicKey,
            mandatePda: mandate.toBase58(),
            amountIn: amount,
          });
          txSignature = await wallet.sendTransaction(
            new Transaction().add(...instructions),
            connection,
            { signers: [sessionKey] },
          );
        }

        setStatus("Waiting for transaction confirmation...");

        const confirmation = await connection.confirmTransaction(
          txSignature,
          "confirmed",
        );

        if (confirmation.value.err) {
          throw new Error("The execute transaction failed on the blockchain.");
        }

        setStatus("Verifying the transaction and recording the receipt...");

        await signedJsonRequest<unknown>(
          wallet,
          `/api/mandates/${encodeURIComponent(activeMandate.id)}/execute`,
          "POST",
          { txSignature },
        );

        setSignature(txSignature);
        setStatus(`Execution successful: ${txSignature}`);

        return txSignature;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Execution failed.";

        setError(message);
        setStatus("");
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [activeMandate, connection, externalAgent, sessionKey, wallet],
  );

  return {
    create,
    execute,
    busy,
    status,
    error,
    signature,
    sessionKey,
    sessionPubkey: sessionKey?.publicKey.toBase58() ?? "",
    externalAgent,
    activeMandate,
    saveSession,
    restoreSession,
    storedSessions,
    sessionBusy,
    refreshStoredSessions,
  };
}
