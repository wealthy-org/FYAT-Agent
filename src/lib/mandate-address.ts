import { PublicKey } from "@solana/web3.js";

const U64_MAX = 18_446_744_073_709_551_615n;

/** u64 little-endian, 8 byte. Setara BN.toArrayLike(Buffer, "le", 8) di e2e. */
function u64Le(value: bigint): Uint8Array {
  if (value < 0n || value > U64_MAX) {
    throw new RangeError("Mandate id must fit in u64");
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

/**
 * PDA mandate. Seed harus identik dengan program:
 * ["mandate", vault, id (u64 LE)]. Sudah lolos di devnet-e2e.ts.
 */
export function findMandatePda(args: {
  vault: string;
  id: bigint;
  programId: string;
}): string {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("mandate"),
      new PublicKey(args.vault).toBytes(),
      u64Le(args.id),
    ],
    new PublicKey(args.programId),
  );
  return pda.toBase58();
}