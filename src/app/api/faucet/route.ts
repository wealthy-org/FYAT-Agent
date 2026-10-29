import { NextResponse, type NextRequest } from "next/server";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ACCOUNT_SIZE,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";

import { ApiError, ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { emptyBodySchema } from "@/server/api/schemas";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { enforceFaucetWalletLimit } from "@/server/security/faucet-rate-limit";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

function isSecretKeyBytes(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 64 &&
    value.every(
      (byte: unknown) =>
        typeof byte === "number" &&
        Number.isInteger(byte) &&
        byte >= 0 &&
        byte <= 255,
    )
  );
}

function parseTreasuryKey(value: string): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim());
  } catch {
    parsed = value.trim();
  }

  if (isSecretKeyBytes(parsed)) return Uint8Array.from(parsed);
  if (typeof parsed === "string") {
    const decoded = bs58.decode(parsed);
    if (decoded.length === 64) return decoded;
  }

  throw new Error("Unsupported faucet treasury key format.");
}

export async function POST(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.vaultWrite, async () => {
    const { wallet } = await readSignedJson(req, emptyBodySchema);
    const env = getServerEnv();
    if (!env.FAUCET_TREASURY_SECRET_KEY) {
      throw new ApiError(
        503,
        "FAUCET_NOT_CONFIGURED",
        "The Devnet faucet is not configured yet.",
      );
    }
    if ((process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") !== "devnet") {
      throw new ApiError(
        503,
        "FAUCET_DEVNET_ONLY",
        "The test faucet is only available on Devnet.",
      );
    }

    let secretKey: Uint8Array;
    try {
      secretKey = parseTreasuryKey(env.FAUCET_TREASURY_SECRET_KEY);
    } catch {
      throw new ApiError(
        503,
        "FAUCET_NOT_CONFIGURED",
        "The Devnet faucet key must be a 64-byte JSON array or Base58 secret key.",
      );
    }

    let treasury: Keypair;
    try {
      treasury = Keypair.fromSecretKey(secretKey);
    } catch {
      throw new ApiError(
        503,
        "FAUCET_NOT_CONFIGURED",
        "The Devnet faucet secret key is invalid. Check that it matches the generated treasury.",
      );
    }

    const recipient = new PublicKey(wallet);
    if (recipient.equals(treasury.publicKey)) {
      throw ApiErrors.validation([
        { path: "wallet", message: "The treasury cannot claim from itself." },
      ]);
    }
    if (!PublicKey.isOnCurve(recipient.toBytes())) {
      throw ApiErrors.validation([
        {
          path: "wallet",
          message: "Enter a wallet address that can receive tokens.",
        },
      ]);
    }

    const connection = getConnection();
    if ((await connection.getGenesisHash()) !== DEVNET_GENESIS_HASH) {
      throw new ApiError(
        503,
        "FAUCET_DEVNET_ONLY",
        "The configured RPC endpoint is not Solana Devnet.",
      );
    }

    const mint = new PublicKey(env.TOKEN_MINT);
    const mintInfo = await getMint(
      connection,
      mint,
      "confirmed",
      TOKEN_PROGRAM_ID,
    );
    if (mintInfo.decimals !== 6) {
      throw new ApiError(
        503,
        "FAUCET_MINT_UNSUPPORTED",
        `The configured token mint uses ${mintInfo.decimals} decimals; this app requires a 6-decimal test mint. Run pnpm mint:setup and update NEXT_PUBLIC_TOKEN_MINT.`,
      );
    }

    const treasuryTokenAccount = getAssociatedTokenAddressSync(
      mint,
      treasury.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const recipientTokenAccount = getAssociatedTokenAddressSync(
      mint,
      recipient,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const treasuryTokenInfo = await connection.getAccountInfo(
      treasuryTokenAccount,
      "confirmed",
    );
    if (!treasuryTokenInfo) {
      throw new ApiError(
        503,
        "FAUCET_LOW_ON_TOKENS",
        "The faucet treasury has no test-token account. Contact the team.",
      );
    }

    const sourceToken = await getAccount(
      connection,
      treasuryTokenAccount,
      "confirmed",
      TOKEN_PROGRAM_ID,
    );
    const tokenAmount = BigInt(env.FAUCET_TOKEN_DRIP_UNITS);
    if (sourceToken.amount < tokenAmount) {
      throw new ApiError(
        503,
        "FAUCET_LOW_ON_TOKENS",
        "The faucet treasury is low on test tokens. Contact the team.",
      );
    }

    const recipientAtaExists = await connection.getAccountInfo(
      recipientTokenAccount,
      "confirmed",
    );
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: recipient,
        lamports: env.FAUCET_SOL_DRIP_LAMPORTS,
      }),
      createAssociatedTokenAccountIdempotentInstruction(
        treasury.publicKey,
        recipientTokenAccount,
        recipient,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
      createTransferCheckedInstruction(
        treasuryTokenAccount,
        mint,
        recipientTokenAccount,
        treasury.publicKey,
        tokenAmount,
        mintInfo.decimals,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.feePayer = treasury.publicKey;
    transaction.recentBlockhash = blockhash;

    const [treasuryLamports, rent, fee] = await Promise.all([
      connection.getBalance(treasury.publicKey, "confirmed"),
      recipientAtaExists
        ? Promise.resolve(0)
        : connection.getMinimumBalanceForRentExemption(
            ACCOUNT_SIZE,
            "confirmed",
          ),
      connection.getFeeForMessage(transaction.compileMessage(), "confirmed"),
    ]);
    const requiredLamports =
      env.FAUCET_SOL_DRIP_LAMPORTS + rent + (fee.value ?? 5_000);
    if (treasuryLamports < requiredLamports) {
      throw new ApiError(
        503,
        "FAUCET_LOW_ON_SOL",
        "The faucet treasury is low on Devnet SOL. Contact the team.",
      );
    }

    await enforceFaucetWalletLimit(wallet);

    transaction.sign(treasury);
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      { preflightCommitment: "confirmed", maxRetries: 3 },
    );
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (confirmation.value.err) {
      throw new ApiError(
        502,
        "FAUCET_TRANSACTION_FAILED",
        "The faucet transfer failed on Devnet. Check the transaction before trying again.",
      );
    }

    return NextResponse.json({
      signature,
      solAmount: env.FAUCET_SOL_DRIP_LAMPORTS / 1_000_000_000,
      tokenAmount: Number(tokenAmount) / 1_000_000,
    });
  });
}
