# WEB3 & SOLANA ONBOARDING GUIDE FOR ALFIAN
## "Solana & FYAT Agent Architecture Explained in Web2 Terms"

**Audience:** Alfian (Software Engineer / Web2 Developer entering Web3)  
**Project:** **FYAT Agent**  
**Purpose:** Explain all necessary Solana, Web3, and FYAT Agent concepts using standard Web2 analogies (APIs, JWTs, OAuth, Scopes, and Databases) with copy-paste code snippets so you can start building immediately with **zero Web3 anxiety**.

---

## 1. Web2 vs Web3 Mental Model (The Translation Guide)

If you understand standard Web2 fullstack architecture, Web3 on Solana is almost identical once you map the terminology:

| Web2 Concept | Solana Web3 Equivalent | How It Works in FYAT Agent |
|---|---|---|
| **User ID / Account ID** | **Public Key (Pubkey / Wallet Address)** | A 44-character Base58 string (e.g. `9xQ...`). Identifies the user on Solana. |
| **Password / OAuth Secret** | **Private Key (Secret Key)** | A 64-byte secret key that proves ownership. **Rule #1: The user must NEVER give this to our server or AI bot.** |
| **Browser Login / Cookie** | **Solana Wallet Adapter (Phantom / Solflare)** | Browser extension that prompts the user: *"Do you want to sign this?"*. Replaces standard email/password login. |
| **Database Row / Record** | **Account / Data Account** | In Solana, everything is stored in "Accounts". You pay a tiny deposit (rent) to store bytes. |
| **Backend REST API / Microservice** | **Solana Program (Smart Contract)** | Code deployed on the blockchain with specific endpoints ("Instructions") like `create_vault`, `execute_swap`. |
| **OAuth 2.0 Scoped Access Token** | **FYAT Mandate (Session Key)** | An ephemeral, temporary keypair authorized with strict limits (e.g. *"Can only spend 5 USDC max, expires in 24 hours"*). |
| **SQL Database (Audit Log)** | **Neon DB + Solana Explorer** | We store logs in **Neon PostgreSQL** for instant UI rendering, while transactions are settled on the Solana blockchain. |

---

## 2. Why Are We Building FYAT Agent? (The Core Problem)

### The Typical Problem in Web3 AI:
1. An AI bot wants to trade or pay for API calls automatically.
2. The user has to paste their wallet's **Private Key** into the bot's `.env` file.
3. **The Risk:** If the bot gets hacked, hallucinates, or gets prompt-injected, the bot can drain 100% of the user's funds in one second.

### The FYAT Agent Solution (Think of it as AWS IAM / Scoped API Keys):
- The user deposits $20 USDC into an isolated onchain vault (**PDA**).
- The user creates a **Mandate**:
  - *"Bot, here is a temporary session key. You are only allowed to spend up to 5 USDC per trade on Meteora. You CANNOT transfer funds to yourself, and your access expires tomorrow."*
- Even if the bot goes crazy and tries to send 1,000 USDC or steal money, **the Solana blockchain rejects the transaction onchain**.
- The user can click **"Revoke"** at any second to kill the session.

---

## 3. Essential Solana Concepts for Alfian

### A. What is a PDA (Program Derived Address)?
- **In simple terms:** It is a smart contract-controlled bank vault.
- A regular wallet has a private key. A **PDA has NO private key**.
- The **only thing** that can move money out of a PDA vault is our FYAT smart contract rules! This guarantees that nobody (not even our backend or rogue devs) can steal user funds without satisfying onchain policy rules.

### B. What is Solana Devnet?
- It is the test playground of Solana.
- It works 100% identically to Solana Mainnet, but the tokens and SOL are **100% FREE** via Faucets.
- We will do all development and testing on **Devnet**.

---

## 4. Frontend Integration: Connecting Wallets in Next.js

Alfian does NOT need to write low-level cryptography. Solana provides official React libraries:

```bash
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### Quick Boilerplate: Setup Wallet Provider in Next.js
```tsx
// components/SolanaProvider.tsx
"use client";
import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use Devnet for development
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

### In Any Page / Component:
```tsx
// app/page.tsx
"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <div className="p-8">
      <WalletMultiButton />
      {connected && (
        <p className="mt-4 text-purple-400 font-mono">
          Connected User Wallet: {publicKey?.toBase58()}
        </p>
      )}
    </div>
  );
}
```

---

## 5. Backend & Database: Neon DB Setup

You will use standard Node.js / PostgreSQL skills.

### Connection String:
In `.env.local`:
```env
DATABASE_URL=postgres://user:password@ep-xyz.neon.tech/neondb?sslmode=require
```

### Querying with standard `pg` or `prisma` / `drizzle`:
When a user configures a mandate on the UI, send a `POST /api/mandate` to save it in Neon DB:
```typescript
// app/api/mandate/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  const body = await req.json();
  const { vaultPda, sessionPubkey, action, maxAmount, maxTotal, expiresInHours } = body;

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO mandates (vault_pda, session_pubkey, allowed_action, max_amount_per_action, max_total_budget, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [vaultPda, sessionPubkey, action, maxAmount, maxTotal, expiresAt]
  );

  return NextResponse.json({ success: true, mandate: result.rows[0] });
}
```

---

## 6. How the "Transaction Builder" UI Works (Step-by-Step for Alfian)

When copying [fidesbuilder.xyz](https://fidesbuilder.xyz/), the main UI interaction has 4 clear visual steps:

1. **Step 1: BUILD (Select Parameters)**
   - User picks: Action (`SWAP` or `TRANSFER`), Asset (`USDC`), Max Cap (`5 USDC`), Expiry (`24h`).
2. **Step 2: VERIFY (Check Policy)**
   - The UI shows a green checkmark: *"Rules verified: Spend limit 5 USDC, venue Meteora DAMM allowed."*
3. **Step 3: SIMULATE (Solana RPC Dry Run)**
   - Call `connection.simulateTransaction(tx)`. It tests if the transaction would succeed on Solana without spending gas.
4. **Step 4: EXECUTE (Submit to Blockchain)**
   - The session key signs the transaction, broadcasts to Devnet RPC, and displays the **Devnet Explorer link** (e.g. `https://explorer.solana.com/tx/<signature>?cluster=devnet`).

---

## 7. Recommended Development Order for Alfian

Don't try to build everything at once. Build it in these bite-sized steps:

1. **Day 1: UI Shell (Next.js + Tailwind + Dark/Violet Theme)**
   - Clone the visual look of [fidesbuilder.xyz](https://fidesbuilder.xyz/).
   - Add the purple metallic logo (`logo.jpeg`).
   - Add the Phantom wallet connect button.
2. **Day 2: Neon DB Integration**
   - Connect Neon DB and create the 3 tables (`vaults`, `mandates`, `mandate_receipts`).
   - Wire up the "Create Mandate" form to save records in Neon.
3. **Day 3: Simulation & Devnet Testing**
   - Use `@solana/web3.js` to simulate transaction calls on Devnet.
   - Show simulated results on the UI playground tabs.
4. **Day 4: Live Receipts Feed**
   - Render the table of executed receipts with clickable Solana Devnet Explorer links.

---

## 8. Cheat Sheet / FAQ for Alfian

- **Q: Do I need to buy SOL or crypto?**  
  **A:** **NO.** Never use real money. In Phantom, go to Settings -> Developer Settings -> Enable Testnet Mode -> Switch network to **Devnet**. Request free SOL from `https://faucet.solana.com/`.
- **Q: Where is the purple logo?**  
  **A:** It is in the same folder: [`logo.jpeg`](file:///Users/mac/Documents/Workspace/Work/Wealth/Oktober/brainstroming/FYT%20Agent/logo.jpeg).
- **Q: What if I get stuck with Solana cryptography?**  
  **A:** Remember that 90% of your job for V1 is **great Frontend UX, Clean API Routes, and Neon DB State Management**. The Solana RPC functions (`Connection`, `PublicKey`, `Transaction`) come directly out-of-the-box from `@solana/web3.js`.
