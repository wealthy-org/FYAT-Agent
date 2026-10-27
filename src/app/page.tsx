import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { BuilderSection } from "@/features/builder";
import { ComparisonSection } from "@/features/comparison";
import { FinalCta } from "@/features/cta";
import { DevelopersSection } from "@/features/developers";
import { HeroSection } from "@/features/hero";
import { PlatformSection } from "@/features/platform";
import { ProtocolSection } from "@/features/protocol";
import { ReceiptsSection } from "@/features/receipts";
import { ConnectWalletButton } from "@/features/wallet";
import { getHeroStats } from "@/server/services/public-stats";
import { getInitialReceipts } from "@/server/services/receipt-feed";

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
        <ComparisonSection />
        <DevelopersSection />
        <FinalCta />
      </main>

      <Footer />
    </>
  );
}