import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FinalCta } from "@/features/cta";
import { DevelopersSection } from "@/features/developers";
import {
  BeforeAfter,
  BuilderOverview,
  ExecutionGraph,
  ReceiptPreview,
  SecurityGrid,
} from "@/features/execution";
import { HeroSection } from "@/features/hero";
import { PlatformSection } from "@/features/platform";
import { ConnectWalletButton } from "@/features/wallet";
import { getHeroStats } from "@/server/services/public-stats";

/** Data publik di-cache; diperbarui paling lama tiap 60 detik. */
export const revalidate = 60;

export default async function HomePage() {
  const stats = await getHeroStats();

  return (
    <>
      <Header actions={<ConnectWalletButton />} hideOnScrollFrom="platform" />

      <main>
        <HeroSection stats={stats} />
        <PlatformSection />
        <BuilderOverview />
        <ExecutionGraph />
        <BeforeAfter />
        <ReceiptPreview />
        <SecurityGrid />
        <DevelopersSection />
        <FinalCta />
      </main>

      <Footer />
    </>
  );
}