# FYAT AGENT (SOLANA AGENT MANDATE & TRANSACTION BUILDER)
## Developer Brief & Onboarding Guide for Alfian

**Project Name:** **FYAT Agent** (Adapted from the reference concept: Fides Builder / [fidesbuilder.xyz](https://fidesbuilder.xyz/))  
**Target Chain:** **Solana Devnet** (Priority Phase 1 — Zero cost via Faucet & Localnet), staged to Mainnet once audited  
**Primary Positioning:** **"Give agents execution rights, not your private key."**  
**Core Value Proposition:** A transaction builder and onchain mandate execution protocol on Solana that lets wallet owners authorize AI agents to assemble, simulate, and execute strictly bounded transactions (spending caps, allowed tokens, explicit venues) via session keys without handing over owner private keys.  
**UI/Aesthetics Guideline:** Copy [fidesbuilder.xyz](https://fidesbuilder.xyz/) layout and UX almost identical (hero headline, action builder playground, signed mandate inspector, receipt feed), with the custom **purple/violet metallic visual branding (`logo.jpeg`)**.  
**Intended Developer:** Alfian & Frontend/Backend Engineers  
**Version:** 1.0 — 26 October 2026  

---

## 1. Executive Summary & Lead Directives for Alfian

Directives from the Team Lead:
1. **Project Name:** **FYAT Agent** (rebranded from Fides Builder reference).
2. **Target Audience for this Doc:** **Alfian** (developer handoff).
3. **Core Mandate:**
   - **Copy the website UI/UX of [fidesbuilder.xyz](https://fidesbuilder.xyz/):** Layout, hero framing (*"Transaction Builder for autonomous agents"*), the mandate builder cards, step-by-step transaction flow, code snippet tabs, and receipt views.
   - **Visual Branding:** Use the metallic **Purple/Violet 'F' Logo** ([`logo.jpeg`](file:///Users/mac/Documents/Workspace/Work/Wealth/Oktober/brainstroming/FYT%20Agent/logo.jpeg)) provided in this folder.
4. **Environment & Budget:**
   - **Solana Devnet First:** Use Devnet faucet USDC and SOL. Zero real capital spent during prototyping.
5. **Architectural Clarity:**
   - **100% Standalone on Solana:** Fides is originally built for EVM (Robinhood Chain, EIP-712). **FYAT Agent is a native Solana implementation** using PDA (Program Derived Address) vaults and session keys.

---

## 2. Conceptual Comparison: Fides vs FYAT Agent

| Dimension | Reference (Fides Builder) | Target Implementation (FYAT Agent) |
|---|---|---|
| **Branding / Persona** | Fides (`fidesbuilder.xyz`), silver/white minimalist look | **FYAT Agent**, metallic Violet/Purple 'F' branding |
| **Blockchain Target** | EVM (Robinhood Chain ID 4663, Base, EIP-712 signatures) | **Solana (Devnet first, native Anchor / PDA)** |
| **Auth Mechanism** | ERC-7715 / EIP-712 offchain authorization | **Solana PDA Vault + Session Key Signer Checks** |
| **Scope of Work** | Protocol transaction builder | **Solana Mandate Protocol + Web Builder Dashboard** |
| **Database & Stack** | Proprietary backend | **Neon DB (PostgreSQL), Next.js (Vercel/Railway), OpenRouter (Free AI)** |

---

## 3. Solana Architecture: How FYAT Agent Works Without Private Keys

The biggest danger in Web3 AI agents is giving the agent the user's private key. If the agent gets prompt-injected or bugs out, the wallet is drained.

### The FYAT Agent Security Boundary:
1. **The Owner's Key Never Touches the Agent:**
   - The user connects Phantom / Solflare to FYAT Agent web app.
   - The user creates a **Vault PDA** (Program Derived Address owned by our Mandate program).
   - The user registers a **Session Key** (a temporary keypair generated for the agent bot) and defines rules:
     - *Max spend per action:* e.g. 5 USDC
     - *Max total budget:* e.g. 50 USDC
     - *Allowed action:* `SWAP` or `TRANSFER`
     - *Allowed tokens:* USDC -> Allowlisted Mint
     - *Expiry:* 24 hours
2. **Execution via Session Key:**
   - The agent only signs with its ephemeral **Session Key**.
   - Our onchain Mandate program checks onchain limits before executing CPI (Cross-Program Invocation).
   - If the agent tries to steal funds or trade outside the allowed budget, the transaction fails onchain.
   - The owner can **Revoke** the session or **Withdraw** funds at any second.

---

## 4. UI/UX Blueprint (Fides Clone + Violet Tweak)

Alfian should replicate the layout and user experience of [fidesbuilder.xyz](https://fidesbuilder.xyz/):

### A. Layout Structure & Pages
1. **Header Navigation:**
   - Logo: Purple Metallic 'F' ([`logo.jpeg`](file:///Users/mac/Documents/Workspace/Work/Wealth/Oktober/brainstroming/FYT%20Agent/logo.jpeg)) + "FYAT Agent".
   - Links: `Builder`, `Docs`, `Receipts`, `Security`.
   - Action Button: `Connect Wallet` (Solana Devnet).
2. **Hero Section:**
   - Big Bold Headline: **"Transaction Builder for autonomous agents."**
   - Subtitle: *"Builds complete Solana agent transaction flows with mandate authorization built into the execution path."*
   - Interactive Live Counter: `Actions Built` and `Transactions Protected`.
3. **Interactive Builder Playground (The Core Feature):**
   - Left side: **Mandate Configurator** (Owner sets asset, spending cap, target program, expiry).
   - Middle side: **Execution Flow Preview** (`Build → Verify → Simulate → Execute`).
   - Right side: **Code Preview Tab** (TypeScript SDK snippet showing live code generation).
4. **Live Receipts Feed (Proof of Execution):**
   - Transparent table showing recent transactions:
     - `Session Key` | `Action` | `Amount` | `Policy Status (PASS/BLOCKED)` | `Solana Explorer Devnet Link`

### B. Styling & Design Tokens
- **Background:** Deep dark canvas (`#0A0A0C` to `#0F0C1B`).
- **Accent Glow:** Electric Violet / Purple glow (`#8B5CF6`, `#A855F7`) matching the `logo.jpeg`.
- **Card Surfaces:** High-end glassmorphism (`backdrop-blur-md`, subtle border `rgba(139, 92, 246, 0.2)`).
- **Typography:** Modern clean sans-serif (`Sora` / `Inter` / `JetBrains Mono` for code and transaction hashes).

---

## 5. Technology Stack & Deployment (Simple & Zero-Cost)

Keep it lean and aligned with our standard workspace architecture:

- **Database:** **Neon DB** (Serverless PostgreSQL, free tier).
- **Frontend / Fullstack:** **Next.js** (App Router, Tailwind CSS, Lucide icons, `@solana/wallet-adapter-react`).
- **Deployment:** **Vercel** (Frontend) & **Railway** (Background simulator / indexer worker).
- **Free LLM (Optional Agent Reasoning):** **OpenRouter Free Tier** (e.g. `meta-llama/llama-3-8b-instruct:free`).

### Minimal Database Schema (Neon DB SQL):
Alfian can paste this directly into Neon SQL Console:
```sql
-- 1. Vaults registered by wallet owners
CREATE TABLE vaults (
  id SERIAL PRIMARY KEY,
  owner_pubkey VARCHAR(64) NOT NULL,
  vault_pda VARCHAR(64) UNIQUE NOT NULL,
  token_mint VARCHAR(64) NOT NULL, -- e.g. Devnet USDC
  balance_base_units NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mandates & Session permissions
CREATE TABLE mandates (
  id SERIAL PRIMARY KEY,
  vault_pda VARCHAR(64) REFERENCES vaults(vault_pda),
  session_pubkey VARCHAR(64) NOT NULL,
  allowed_action VARCHAR(32) NOT NULL, -- 'TRANSFER' | 'SWAP'
  max_amount_per_action NUMERIC NOT NULL,
  max_total_budget NUMERIC NOT NULL,
  current_spent NUMERIC DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Execution receipts (Public audit tape)
CREATE TABLE mandate_receipts (
  id SERIAL PRIMARY KEY,
  mandate_id INT REFERENCES mandates(id),
  action VARCHAR(32) NOT NULL,
  amount_spent NUMERIC NOT NULL,
  recipient_or_venue VARCHAR(64),
  tx_signature VARCHAR(128),
  status VARCHAR(20) NOT NULL, -- 'SUCCESS' | 'REJECTED_BY_POLICY' | 'FAILED_SIMULATION'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. TypeScript SDK Usage Example (For Developer Playground)

Display this in the playground tab on the website so developers see how easy it is to use FYAT Agent:

```typescript
import { createFyatClient, FyatMandate } from "@fyat/sdk";

// 1. Initialize client on Solana Devnet
const client = createFyatClient({
  network: "devnet",
  rpcUrl: "https://api.devnet.solana.com"
});

// 2. Owner defines constrained mandate
const mandate = await client.createMandate({
  vaultPda: "4xK...vault",
  sessionSigner: agentKeypair.publicKey,
  permissions: {
    action: "SWAP",
    inputMint: "USDC_DEVNET_MINT",
    outputMint: "TOKEN_MINT",
    maxPerAction: 5_000_000, // 5 USDC
    maxTotal: 50_000_000,    // 50 USDC
    expiresInHours: 24
  }
});

// 3. Agent plans, simulates, and executes safely
const plan = await mandate.build({
  amountIn: 3_000_000, // 3 USDC
  venue: "METEORA_DAMM"
});

await plan.simulate(); // Verifies onchain rules before broadcasting
const txSignature = await plan.executeWithSession(agentKeypair);
console.log("Transaction successfully executed under mandate:", txSignature);
```

---

## 7. Concrete Launch Demo (Hero Workflow)

To prove this works in demo videos and presentations:
1. Owner connects Phantom on Devnet, creates Vault, deposits 20 Devnet USDC.
2. Owner creates Mandate for AI Agent with a strict limit: **Max 5 USDC per trade**.
3. **Test 1 (Normal Execution):** Agent executes a 3 USDC swap -> **SUCCESS**, recorded on Devnet Explorer.
4. **Test 2 (Policy Blocked):** Agent tries to execute a 10 USDC swap -> **REJECTED ONCHAIN BY MANDATE**.
5. **Test 3 (Theft Prevention):** Agent tries to send funds to its own wallet address -> **REJECTED ONCHAIN**.
6. **Test 4 (Instant Revoke):** Owner clicks "Revoke Session" on the dashboard -> Agent loses all execution rights immediately.

---

## 8. Development Milestones & Checklist (For Alfian)

| Phase | Milestone | Scope & Deliverables |
|---|---|---|
| **Phase 1: Web Interface & Fides Clone** | Replicate [fidesbuilder.xyz](https://fidesbuilder.xyz/) UI | [ ] Next.js app with deep dark canvas and violet metallic branding (`logo.jpeg`)<br>[ ] Hero section with interactive builder cards & SDK code tabs<br>[ ] Solana Wallet Adapter integration (Phantom / Solflare) |
| **Phase 2: Database & Simulation Engine** | Neon DB + Mandate State | [ ] Setup Neon DB with `vaults`, `mandates`, and `mandate_receipts` tables<br>[ ] API routes to create mandates, calculate limits, and log receipts<br>[ ] Transaction simulation preview using `@solana/web3.js` |
| **Phase 3: Devnet Program / Vault Flow** | Solana PDA Vault & Session Auth | [ ] Anchor program or PDA vault script on Devnet<br>[ ] Capped token transfer & swap adapter validation<br>[ ] Positive & negative policy enforcement tests |
| **Phase 4: Public Receipts Tape & Deployment** | Final Polish & Cloud Hosting | [ ] Live transaction tape showing real Devnet transaction signatures<br>[ ] Deploy frontend to Vercel and background workers to Railway |

---

## 9. Frequently Asked Questions (FAQ) for Devs

- **Q: Does Alfian need to write an EVM smart contract?**  
  **A:** **NO.** Fides was on EVM, but FYAT Agent is strictly **Solana-native** using PDAs and Solana instructions.
- **Q: Is there any token or ICO needed for V1?**  
  **A:** **NO.** There is no token and no staking in V1. It is pure infrastructure and builder UX.
- **Q: Where do we get test USDC on Devnet?**  
  **A:** You can use the standard SPL Token CLI or Solana Web3.js to mint a test SPL token (representing USDC) on Devnet with 6 decimals.
