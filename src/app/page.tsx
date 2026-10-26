import { Header } from "@/components/layout/header";
import { HeroSection, placeholderHeroStats } from "@/features/hero";
import { ConnectWalletButton } from "@/features/wallet";

export default function HomePage() {
  return (
    <>
      <Header actions={<ConnectWalletButton />} />

      <main>
        <HeroSection stats={placeholderHeroStats} />
      </main>
    </>
  );
}