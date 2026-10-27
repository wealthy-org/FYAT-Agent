import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <Section
      aria-labelledby="cta-title"
      className="relative overflow-hidden text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(139_92_246/0.22),transparent_65%)]"
      />

      <Container className="relative">
        <h2
          id="cta-title"
          className="mx-auto max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight md:text-5xl"
        >
          Build agent transactions before they hit the chain.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-fg-muted">
          A new foundation for autonomous execution.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/builder">Open Builder</Button>
          <Button href="/#developers" variant="secondary">
            Explore docs
          </Button>
        </div>
      </Container>
    </Section>
  );
}