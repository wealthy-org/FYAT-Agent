
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * Derive akun token untuk simulasi transfer SPL biasa.
 */
export function deriveTransferAccounts(
  mint: PublicKey,
  payer: PublicKey,
  recipient: PublicKey,
) {
  const sourceAta = getAssociatedTokenAddressSync(
    mint,
    payer,
  );

  const destinationAta = getAssociatedTokenAddressSync(
    mint,
    recipient,
  );

  return {
    sourceAta,
    destinationAta,
  };
}

type BuildTransferTransactionParams = {
  payer: PublicKey;
  mint: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  decimals: number;
};

/**
 * Membangun transaksi SPL Token biasa untuk simulasi.
 * Ini bukan instruksi execute_transfer FYAT dan tidak mengirim transaksi.
 */
export function buildTransferTransaction(
  params: BuildTransferTransactionParams,
): VersionedTransaction {
  const {
    payer,
    mint,
    recipient,
    amount,
    decimals,
  } = params;

  if (amount <= 0n) {
    throw new RangeError("Amount must be positive");
  }

  const { sourceAta, destinationAta } =
    deriveTransferAccounts(mint, payer, recipient);

  const instruction = createTransferCheckedInstruction(
    sourceAta,
    mint,
    destinationAta,
    payer,
    amount,
    decimals,
    [],
    TOKEN_PROGRAM_ID,
  );

  const message = new TransactionMessage({
    payerKey: payer,
    // Placeholder; simulateTransaction akan menggantinya.
    recentBlockhash: PublicKey.default.toBase58(),
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}
