import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

import { StatsStrip } from "../story/components/stats-strip";
import { storyCopy } from "../story/data";
import { HeroOrb } from "./hero-orb";
import { NetworkBadge } from "./network-badge";

export function HeroStatic() {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden pb-24 pt-36 text-center md:pt-44"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-150 bg-[radial-gradient(ellipse_at_50%_0%,rgb(139_92_246/0.22),transparent_65%)]"
        />

        <Container className="relative">
          <NetworkBadge />

          <h1
            id="hero-title"
            className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-semibold tracking-tight md:text-6xl"
          >
            Transaction Builder for autonomous agents.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm text-fg-muted md:text-base">
            Builds complete Solana agent transaction flows with mandate
            authorization built into the execution path.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/#builder">Open Builder</Button>
            <Button href="/#security" variant="secondary">
              How it stays safe
            </Button>
          </div>

          <HeroOrb className="mx-auto mt-16 w-[min(340px,70vw)]" />

          <p className="mx-auto mt-12 max-w-md text-xs text-fg-muted">
            {siteConfig.tagline}
          </p>

        </Container>
      </section>

      <section aria-label="How FYAT works" className="pb-24 text-center">
        <Container>
          <h2 className="mx-auto max-w-xl text-balance font-display text-3xl font-light tracking-tight md:text-5xl">
            {storyCopy.first.title}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-sm text-fg-muted md:text-base">
            {storyCopy.first.body}
          </p>
          <p className="mx-auto mt-10 max-w-xl text-pretty text-sm text-fg-muted md:text-base">
            {storyCopy.second.body}
          </p>
          <p className="mt-5 font-mono text-xs text-fg">{storyCopy.second.flow}</p>

          <div className="mt-12">
            <StatsStrip active animate={false} />
          </div>
        </Container>
      </section>
    </>
  );
}