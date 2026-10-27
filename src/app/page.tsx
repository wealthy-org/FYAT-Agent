import { Header } from "@/components/layout/header";
import { BuilderSection } from "@/features/builder";
import { HeroSection } from "@/features/hero";
import { PlatformSection } from "@/features/platform";
import { ProtocolSection } from "@/features/protocol";
import { ReceiptsSection } from "@/features/receipts";
import { ConnectWalletButton } from "@/features/wallet";
import { getInitialReceipts } from "@/server/services/receipt-feed";
import { getHeroStats } from "@/server/services/public-stats";

/** Data publik di-cache; diperbarui paling lama tiap 60 detik. */
export const revalidate = 60;

export default async function HomePage() {
  const [stats, receipts] = await Promise.all([
    getHeroStats(),
    getInitialReceipts(),
  ]);

  return (
    <>
      <Header actions={<ConnectWalletButton />} />

      <main>
        <HeroSection stats={stats} />
        <PlatformSection />
        <BuilderSection />
        <ReceiptsSection initial={receipts} />
        <ProtocolSection />
      </main>
    </>
  );
}