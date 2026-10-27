import { Header } from "@/components/layout/header";
import { BuilderSection } from "@/features/builder";
import { HeroSection, placeholderHeroStats } from "@/features/hero";
import { PlatformSection } from "@/features/platform";
import { ProtocolSection } from "@/features/protocol";
import { ConnectWalletButton } from "@/features/wallet";

export default function HomePage() {
  return (
    <>
      <Header actions={<ConnectWalletButton />} />

      <main>
        <HeroSection stats={placeholderHeroStats} />
        <PlatformSection />
        <BuilderSection />
        <ProtocolSection />
      </main>
    </>
  );
}