"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { Button } from "@/components/ui/button";

import { useIsClient } from "../hooks/use-is-client";
import { WalletMenu } from "./wallet-menu";

export function ConnectWalletButton() {
  const isClient = useIsClient();
  const { publicKey, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  // Server dan hydration pertama selalu render ini → tidak ada mismatch.
  if (!isClient) {
    return (
      <Button size="sm" disabled>
        Connect Wallet
      </Button>
    );
  }

  if (publicKey) {
    return (
      <WalletMenu
        address={publicKey.toBase58()}
        onDisconnect={() => {
          disconnect().catch(() => {
            // Gagal disconnect tidak kritis: state wallet tetap dikelola adapter.
          });
        }}
      />
    );
  }

  return (
    <Button size="sm" disabled={connecting} onClick={() => setVisible(true)}>
      {connecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}