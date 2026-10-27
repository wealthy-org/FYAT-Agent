import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  TransactionMessage,
  VersionedTransaction,
  type PublicKey,
} from "@solana/web3.js";

/**
 * Dengan `replaceRecentBlockhash: true`, RPC mengabaikan nilai ini.
 * Memakai konstanta menghemat satu panggilan jaringan.
 */
const PLACEHOLDER_BLOCKHASH = "11111111111111111111111111111111";

export function deriveTransferAccounts(
  mint: PublicKey,
  payer: PublicKey,
  recipient: PublicKey,
) {
  return {
    sourceAta: getAssociatedTokenAddressSync(mint, payer),
    // true: recipient boleh berupa alamat off-curve (misalnya PDA).
    destinationAta: getAssociatedTokenAddressSync(mint, recipient, true),
  };
}

type BuildTransferParams = {
  payer: PublicKey;
  mint: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  decimals: number;
};

/** Membuat token account tujuan bila belum ada (idempoten), lalu transfer. */
export function buildTransferTransaction(
  params: BuildTransferParams,
): VersionedTransaction {
  const { payer, mint, recipient, amount, decimals } = params;
  const { sourceAta, destinationAta } = deriveTransferAccounts(
    mint,
    payer,
    recipient,
  );

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: PLACEHOLDER_BLOCKHASH,
    instructions: [
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        destinationAta,
        recipient,
        mint,
      ),
      createTransferCheckedInstruction(
        sourceAta,
        mint,
        destinationAta,
        payer,
        amount,
        decimals,
      ),
    ],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}