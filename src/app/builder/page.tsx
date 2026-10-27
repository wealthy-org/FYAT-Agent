import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { BuilderSection } from "@/features/builder";
import { ReceiptsSection } from "@/features/receipts";
import { ConnectWalletButton } from "@/features/wallet";
import { getInitialReceipts } from "@/server/services/receipt-feed";

export const metadata: Metadata = {
  title: "Builder",
  alternates: { canonical: "/builder" },
};

/** Data publik di-cache; diperbarui paling lama tiap 60 detik. */
export const revalidate = 60;

export default async function BuilderPage() {
  const receipts = await getInitialReceipts();

  return (
    <>
      <Header actions={<ConnectWalletButton />} />

      {/* pt-16 = tinggi header fixed, karena /app tidak punya hero layar penuh. */}
      <main className="pt-16">
        <BuilderSection />
        <ReceiptsSection initial={receipts} />
      </main>

      <Footer />
    </>
  );
}