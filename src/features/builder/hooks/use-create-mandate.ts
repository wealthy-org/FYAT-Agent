
"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
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

const PROGRAM_ID = new PublicKey(FYAT_PROGRAM_ID);

type CreateResponse = {
  mandate?: { id?: string };
  id?: string;
};

export type ActiveMandate = {
  id: string;
  mandatePda: string;
  owner: string;
  mint: string;
  recipient: string;
  maxPerAction: bigint;
  maxTotal: bigint;
};

export function useCreateMandate() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [sessionKey, setSessionKey] = useState<Keypair | null>(null);
  const [activeMandate, setActiveMandate] =
    useState<ActiveMandate | null>(null);
  const [storedSessions, setStoredSessions] = useState<string[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);

  const refreshStoredSessions = useCallback(() => {
    if (!wallet.publicKey) {
      setStoredSessions([]);
      return;
    }

    setStoredSessions(
      listStoredSessions(wallet.publicKey.toBase58()),
    );
  }, [wallet.publicKey]);

  const create = useCallback(
    async (config: MandateConfig) => {
      if (
        !wallet.publicKey ||
        !wallet.signTransaction ||
        !wallet.signAllTransactions ||
        !wallet.signMessage
      ) {
        throw new Error(
          "Hubungkan wallet yang mendukung transaksi terlebih dahulu.",
        );
      }

      if (config.action !== "TRANSFER") {
        throw new Error(
          "Tahap ini hanya mendukung mandate TRANSFER.",
        );
      }

      setBusy(true);
      setError("");
      setStatus("Memeriksa vault...");
      setSignature("");

      try {
        const mintValue = env.NEXT_PUBLIC_TOKEN_MINT;

        if (!mintValue) {
          throw new Error(
            "NEXT_PUBLIC_TOKEN_MINT belum dikonfigurasi.",
          );
        }

        const mint = new PublicKey(mintValue);
        const owner = wallet.publicKey;
        const recipient = new PublicKey(config.recipient);

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
          setStatus("Menunggu persetujuan pembuatan vault...");

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

          const initConfirmation =
            await connection.confirmTransaction(
              initSignature,
              "confirmed",
            );

          if (initConfirmation.value.err) {
            throw new Error(
              "Pembuatan vault gagal dikonfirmasi.",
            );
          }

          setSignature(initSignature);
        }

        setStatus("Memverifikasi vault on-chain...");

        const vaultAccount =
          await program.account.vault.fetch(vaultAddress);

        if (
          !vaultAccount.owner.equals(owner) ||
          !vaultAccount.mint.equals(mint)
        ) {
          throw new Error(
            "Vault on-chain tidak cocok dengan wallet atau token mint.",
          );
        }

        setStatus("Mendaftarkan vault ke aplikasi...");

        await signedJsonRequest<{ vault: { id: string } }>(
          wallet,
          "/api/vaults",
          "POST",
          {},
        );

        const mandateNumber = BigInt(
          vaultAccount.nextMandateId.toString(),
        );

        const session = Keypair.generate();

        const mandateAddress = new PublicKey(
          findMandatePda({
            vault: vaultAddress.toBase58(),
            id: mandateNumber,
            programId: PROGRAM_ID.toBase58(),
          }),
        );

        const expiresAt =
          Math.floor(Date.now() / 1000) +
          config.expiresInHours * 60 * 60;

        setStatus(
          "Menunggu persetujuan pembuatan mandate...",
        );

        const createSignature = await program.methods
          .createMandate({
            session: session.publicKey,
            recipient,
            maxPerAction: new BN(
              config.maxPerAction.toString(),
            ),
            maxTotal: new BN(config.maxTotal.toString()),
            expiresAt: new BN(expiresAt.toString()),
          })
          .accounts({
            owner,
            vault: vaultAddress,
            mandate: mandateAddress,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const createConfirmation =
          await connection.confirmTransaction(
            createSignature,
            "confirmed",
          );

        if (createConfirmation.value.err) {
          throw new Error(
            "Pembuatan mandate gagal dikonfirmasi.",
          );
        }

        setSignature(createSignature);
        setStatus("Mendaftarkan mandate ke aplikasi...");

        const response =
          await signedJsonRequest<CreateResponse>(
            wallet,
            "/api/mandates",
            "POST",
            {
              sessionPubkey: session.publicKey.toBase58(),
              config: {
                action: config.action,
                recipient: recipient.toBase58(),
                maxPerAction: formatUnits(
                  config.maxPerAction,
                  USDC_DECIMALS,
                ),
                maxTotal: formatUnits(
                  config.maxTotal,
                  USDC_DECIMALS,
                ),
                expiresInHours: String(
                  config.expiresInHours,
                ),
              },
              mandatePda: mandateAddress.toBase58(),
              createSignature,
            },
          );

        const dbMandateId =
          response.mandate?.id ?? response.id;

        if (!dbMandateId) {
          throw new Error(
            "Mandate sudah dibuat on-chain, tetapi ID API tidak ditemukan. Jangan membuat mandate baru.",
          );
        }

        const nextMandate: ActiveMandate = {
          id: dbMandateId,
          mandatePda: mandateAddress.toBase58(),
          owner: owner.toBase58(),
          mint: mint.toBase58(),
          recipient: recipient.toBase58(),
          maxPerAction: config.maxPerAction,
          maxTotal: config.maxTotal,
        };

        setSessionKey(session);
        setActiveMandate(nextMandate);
        refreshStoredSessions();

        setStatus(
          `Mandate berhasil dibuat on-chain: ${mandateAddress.toBase58()}`,
        );

        return {
          id: dbMandateId,
          signature: createSignature,
          mandatePda: mandateAddress.toBase58(),
          sessionPubkey: session.publicKey.toBase58(),
          response,
        };
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Transaksi gagal.";

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
        throw new Error("Hubungkan wallet pemilik mandate.");
      }

      if (!sessionKey || !activeMandate) {
        throw new Error("Belum ada session aktif yang dapat disimpan.");
      }

      if (wallet.publicKey.toBase58() !== activeMandate.owner) {
        throw new Error("Wallet saat ini bukan pemilik mandate.");
      }

      if (!isPassphraseValid(passphrase)) {
        throw new Error(`Passphrase minimal ${MIN_PASSPHRASE_LENGTH} karakter.`);
      }

      setSessionBusy(true);
      setError("");
      setStatus("Mengenkripsi dan menyimpan session...");

      try {
        const storedSession = {
          id: activeMandate.id,
          owner: activeMandate.owner,
          mandatePda: activeMandate.mandatePda,
          mint: activeMandate.mint,
          recipient: activeMandate.recipient,
          maxPerAction: activeMandate.maxPerAction.toString(),
          maxTotal: activeMandate.maxTotal.toString(),
          sessionPublicKey: sessionKey.publicKey.toBase58(),
          secretKey: Array.from(sessionKey.secretKey),
        };

await saveEncryptedSession({ passphrase, session: storedSession });

        refreshStoredSessions();
        setStatus("Session terenkripsi berhasil disimpan.");
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Gagal menyimpan session.";

        setError(message);
        setStatus("");
        throw cause;
      } finally {
        setSessionBusy(false);
      }
    },
    [
      activeMandate,
      refreshStoredSessions,
      sessionKey,
      wallet.publicKey,
    ],
  );
  
const restoreSession = useCallback(
  async (mandatePda: string, passphrase: string) => {
    if (!wallet.publicKey) {
      throw new Error("Hubungkan wallet pemilik mandate.");
    }

    if (!isPassphraseValid(passphrase)) {
      throw new Error(`Passphrase minimal ${MIN_PASSPHRASE_LENGTH} karakter.`);
    }

    const normalizedPda = new PublicKey(mandatePda.trim()).toBase58();

    setSessionBusy(true);
    setError("");
    setStatus("Membuka session terenkripsi...");

    try {
      const restored = await restoreEncryptedSession({
        passphrase,
        owner: wallet.publicKey.toBase58(),
        mandatePda: normalizedPda,
      });

      const restoredKeypair = restored.keypair;
      const mintValue = env.NEXT_PUBLIC_TOKEN_MINT;

      if (!mintValue) {
        throw new Error("NEXT_PUBLIC_TOKEN_MINT belum dikonfigurasi.");
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
        throw new Error("Vault on-chain tidak cocok dengan wallet.");
      }

      if (
        !mandateAccount.vault.equals(vault) ||
        !mandateAccount.session.equals(restoredKeypair.publicKey)
      ) {
        throw new Error(
          "Session key atau vault tidak cocok dengan mandate on-chain.",
        );
      }

      if (mandateAccount.revokedAt.toString() !== "0") {
        throw new Error("Mandate ini sudah dicabut.");
      }

      if (
        Number(mandateAccount.expiresAt.toString()) <=
        Math.floor(Date.now() / 1000)
      ) {
        throw new Error("Mandate ini sudah kedaluwarsa.");
      }

      const restoredMandate: ActiveMandate = {
        id: restored.session.id,
        mandatePda: normalizedPda,
        owner: owner.toBase58(),
        mint: mint.toBase58(),
        recipient: mandateAccount.recipient.toBase58(),
        maxPerAction: BigInt(mandateAccount.maxPerAction.toString()),
        maxTotal: BigInt(mandateAccount.maxTotal.toString()),
      };

      setSessionKey(restoredKeypair);
      setActiveMandate(restoredMandate);
      setStatus(`Session berhasil dipulihkan: ${normalizedPda}`);

      return restoredMandate;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Gagal memulihkan session.";

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
        throw new Error(
          "Hubungkan wallet pemilik mandate terlebih dahulu.",
        );
      }

      if (!sessionKey || !activeMandate) {
        throw new Error(
          "Session key atau mandate aktif tidak tersedia. Pulihkan session yang benar terlebih dahulu.",
        );
      }

      if (
        wallet.publicKey.toBase58() !== activeMandate.owner
      ) {
        throw new Error(
          "Wallet saat ini bukan pemilik mandate.",
        );
      }

      if (amount <= 0n) {
        throw new Error(
          "Jumlah transfer harus lebih besar dari nol.",
        );
      }

      if (amount > activeMandate.maxPerAction) {
        throw new Error(
          "Jumlah melebihi batas per transaksi mandate.",
        );
      }

      setBusy(true);
      setError("");
      setStatus("Memeriksa mandate dan saldo vault...");

      try {
        const mint = new PublicKey(activeMandate.mint);
        const owner = new PublicKey(activeMandate.owner);
        const recipient = new PublicKey(
          activeMandate.recipient,
        );
        const mandate = new PublicKey(
          activeMandate.mandatePda,
        );

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

        const destinationTokenAccount =
          getAssociatedTokenAddressSync(
            mint,
            recipient,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          );

        const program = createFyatProgram(connection, wallet);

        const [vaultAccount, mandateAccount] =
          await Promise.all([
            program.account.vault.fetch(vault),
            program.account.mandate.fetch(mandate),
          ]);

        if (
          !vaultAccount.owner.equals(owner) ||
          !vaultAccount.mint.equals(mint)
        ) {
          throw new Error(
            "Data vault on-chain tidak cocok.",
          );
        }

        if (
          !mandateAccount.vault.equals(vault) ||
          !mandateAccount.session.equals(
            sessionKey.publicKey,
          ) ||
          !mandateAccount.recipient.equals(recipient)
        ) {
          throw new Error(
            "Mandate, session key, atau recipient tidak cocok dengan data on-chain.",
          );
        }

        if (mandateAccount.revokedAt.toString() !== "0") {
          throw new Error("Mandate sudah dicabut.");
        }

        if (
          Number(mandateAccount.expiresAt.toString()) <=
          Math.floor(Date.now() / 1000)
        ) {
          throw new Error("Mandate sudah kedaluwarsa.");
        }

        const onchainMaxPerAction = BigInt(
          mandateAccount.maxPerAction.toString(),
        );
        const onchainMaxTotal = BigInt(
          mandateAccount.maxTotal.toString(),
        );
        const onchainSpent = BigInt(
          mandateAccount.spent.toString(),
        );

        if (amount > onchainMaxPerAction) {
          throw new Error(
            "Jumlah melampaui batas per aksi on-chain.",
          );
        }

        if (onchainSpent + amount > onchainMaxTotal) {
          throw new Error(
            "Jumlah melampaui sisa anggaran mandate.",
          );
        }

        const balance =
          await connection.getTokenAccountBalance(
            vaultTokenAccount,
            "confirmed",
          );

        if (BigInt(balance.value.amount) < amount) {
          throw new Error(
            "Saldo USDC vault tidak mencukupi. Deposit ke vault terlebih dahulu.",
          );
        }

        const destinationInfo =
          await connection.getAccountInfo(
            destinationTokenAccount,
            "confirmed",
          );

        if (!destinationInfo) {
          throw new Error(
            "Token account penerima belum ada. Buat ATA penerima terlebih dahulu sebelum execute.",
          );
        }

        setStatus(
          "Menunggu wallet menyetujui biaya transaksi. Session key menandatangani instruksi.",
        );

        const txSignature = await program.methods
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

        setStatus("Menunggu konfirmasi transaksi...");

        const confirmation =
          await connection.confirmTransaction(
            txSignature,
            "confirmed",
          );

        if (confirmation.value.err) {
          throw new Error(
            "Transaksi execute gagal di blockchain.",
          );
        }

        setStatus(
          "Memverifikasi transaksi dan mencatat receipt...",
        );

        await signedJsonRequest<unknown>(
          wallet,
          `/api/mandates/${encodeURIComponent(activeMandate.id)}/execute`,
          "POST",
          { txSignature },
        );

        setSignature(txSignature);
        setStatus(`Eksekusi berhasil: ${txSignature}`);

        return txSignature;
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Eksekusi gagal.";

        setError(message);
        setStatus("");
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [activeMandate, connection, sessionKey, wallet],
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
    activeMandate,
    saveSession,
    restoreSession,
    storedSessions,
    sessionBusy,
    refreshStoredSessions,
  };
}
