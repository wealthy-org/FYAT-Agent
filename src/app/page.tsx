import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ComparisonSection } from "@/features/comparison";
import { FinalCta } from "@/features/cta";
import { DevelopersSection } from "@/features/developers";
import { HeroSection } from "@/features/hero";
import { PlatformSection } from "@/features/platform";
import { ProtocolSection } from "@/features/protocol";
import { ConnectWalletButton } from "@/features/wallet";
import { getHeroStats } from "@/server/services/public-stats";

/** Data publik di-cache; diperbarui paling lama tiap 60 detik. */
export const revalidate = 60;

export default async function HomePage() {
  const stats = await getHeroStats();

  return (
    <>
      <Header actions={<ConnectWalletButton />} />

      <main>
        <HeroSection stats={stats} />
        <PlatformSection />
        <ProtocolSection />
        <ComparisonSection />
        <DevelopersSection />
        <FinalCta />
      </main>

      <Footer />
    </>
  );
}