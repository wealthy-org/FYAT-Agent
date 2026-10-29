/** Mencari pool DAMM v2 yang berisi mint USDC tes dan mint pasangan. */
import { Connection, PublicKey } from "@solana/web3.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";

const PAIR_MINT = "3GnewbrniRRRp3Ehp5zGtja9PnS4s6LWQi5g313wWAXB";

async function main(): Promise<void> {
  const usdc = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT ?? "");
  const pair = new PublicKey(PAIR_MINT);
  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const cpAmm = new CpAmm(new Connection(rpcUrl, "confirmed"));

  // Urutan token A/B di pool bisa terbalik, jadi cari dari dua sisi.
  const found = [
    ...(await cpAmm.fetchPoolStatesByTokenAMint(usdc)),
    ...(await cpAmm.fetchPoolStatesByTokenAMint(pair)),
  ].filter(
    ({ account }) =>
      [account.tokenAMint.toBase58(), account.tokenBMint.toBase58()].sort().join() ===
      [usdc.toBase58(), pair.toBase58()].sort().join(),
  );

  console.log(`Found ${found.length} pools`);
  for (const { publicKey, account } of found) {
    console.log(`POOL=${publicKey.toBase58()}`);
    console.log(`TOKEN_A=${account.tokenAMint.toBase58()}`);
    console.log(`TOKEN_B=${account.tokenBMint.toBase58()}`);
    console.log(`VAULT_A=${account.tokenAVault.toBase58()}`);
    console.log(`VAULT_B=${account.tokenBVault.toBase58()}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});