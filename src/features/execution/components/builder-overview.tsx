"use client";

import { useEffect, useState } from "react";

import { Container } from "@/components/layout/container";
import { ToneSection } from "@/components/layout/tone-section";
import { Button } from "@/components/ui/button";
import { ExecHeading } from "@/components/ui/exec-heading";
import { Reveal } from "@/components/ui/reveal";
import { useInView } from "@/hooks/use-in-view";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/cn";

import { builderHandles, builderSteps } from "../data";

const STEP_MS = 1700;

export function BuilderOverview() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({
    rootMargin: "0px",
    threshold: 0.35,
  });

  useEffect(() => {
    if (!inView || paused || reduced) return;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % builderSteps.length),
      STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [inView, paused, reduced]);

  return (
    <ToneSection id="platform" tone="light" aria-labelledby="builder-title">
      <Container>
        <ExecHeading
          id="builder-title"
          tone="light"
          index="01"
          label="Builder"
          title="The Transaction Builder"
          description="The Builder receives an agent workflow and converts it into the smallest valid execution plan it can construct."
        />

        <div
          ref={ref}
          className="mt-16"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Reveal>
            <nav aria-label="Builder pipeline" className="overflow-x-auto pb-2">
              <ol className="mx-auto flex w-max items-center gap-3">
                {builderSteps.map((label, i) => (
                  <li key={label} className="flex shrink-0 items-center gap-3">
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className="relative h-px w-8 overflow-hidden bg-ink-line md:w-12"
                      >
                        <span
                          className={cn(
                            "absolute inset-0 origin-left bg-brand-500 transition-transform duration-700 ease-out",
                            i <= active ? "scale-x-100" : "scale-x-0",
                          )}
                        />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-current={i === active ? "step" : undefined}
                      className={cn(
                        "font-mono text-[11px] transition-[color,scale] duration-300 active:scale-95",
                        i === active
                          ? "text-brand-600"
                          : i < active
                            ? "text-ink"
                            : "text-ink-muted",
                      )}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </Reveal>

          <Reveal delay={120} className="mt-10">
            <div className="rounded-3xl bg-white p-6 shadow-[0_28px_70px_-30px_rgb(76_29_149/0.35)] ring-1 ring-ink-line md:p-10">
              <h3 className="font-display text-lg">Builder handles</h3>

              <ul className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 lg:grid-cols-4">
                {builderHandles.map((handle) => (
                  <li
                    key={handle.label}
                    className={cn(
                      "border-t py-3 text-sm transition-colors duration-500",
                      handle.step === active
                        ? "border-brand-500 text-brand-600"
                        : "border-ink-line text-ink-muted",
                    )}
                  >
                    {handle.label}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={200} className="mt-8 flex justify-center">
            <Button href="/docs/builder-overview">Open Builder</Button>
          </Reveal>
        </div>
      </Container>
    </ToneSection>
  );
}