"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useMemo, type ReactNode } from "react";

import { env } from "@/lib/env";
import "../wallet-modal.css";
import "@solana/wallet-adapter-react-ui/styles.css";

const CONNECTION_CONFIG = { commitment: "confirmed" } as const;

// Dideklarasikan di luar komponen agar referensinya stabil di setiap render.
function handleWalletError(error: Error): void {
  // Penolakan dari user (menutup popup) termasuk error di sini.
  if (process.env.NODE_ENV === "development") {
    console.error("[wallet]", error.name, error.message);
  }
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider
      endpoint={env.NEXT_PUBLIC_SOLANA_RPC_URL}
      config={CONNECTION_CONFIG}
    >
      <WalletProvider wallets={wallets} onError={handleWalletError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}