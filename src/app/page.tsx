import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { HeroSection, placeholderHeroStats } from "@/features/hero";

export default function HomePage() {
  return (
    <>
      <Header
        actions={
          <Button size="sm" disabled>
            Connect Wallet
          </Button>
        }
      />

      <main>
        <HeroSection stats={placeholderHeroStats} />
      </main>
    </>
  );
}