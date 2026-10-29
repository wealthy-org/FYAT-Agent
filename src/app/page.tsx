import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
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

/** Data publik di-cache; diperbarui paling lama tiap 60 detik. */
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Header
        actions={<Button href="/docs/playground">Use FYAT</Button>}
        hideOnScrollFrom="platform"
      />

      <main>
        <HeroSection />
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