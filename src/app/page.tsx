import { Header } from "@/components/layout/header";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

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

      <main className="pt-16">
        <Container className="space-y-6 py-24">
          <Eyebrow>Component check</Eyebrow>

          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="secondary" href="https://explorer.solana.com">
              External link
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>Default card</Card>
            <Card variant="glow">Glow card</Card>
          </div>

          {/* Spacer supaya bisa menguji header saat scroll */}
          <div id="builder" className="h-[120vh]" />
        </Container>
      </main>
    </>
  );
}