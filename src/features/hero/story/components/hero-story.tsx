
"use client";

import Image from "next/image";
import { useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import { HeroStatic } from "../../components/hero-static";
import { HeroStats } from "../../components/hero-stats";
import type { HeroStat } from "../../types";
import { STORY } from "../config";
import { useHeroStory } from "../use-hero-story";
import { NodeField } from "./node-field";
import { StatsStrip } from "./stats-strip";
import { StoryCopy } from "./story-copy";

type HeroProps = {
  stats: readonly HeroStat[];
};

function HeroStage({ stats }: HeroProps) {
  const [stripActive, setStripActive] = useState(false);

  const {
    containerRef,
    glowRef,
    canvasRef,
    logoRef,
    introRef,
    nodeRefs,
    copy1Ref,
    copy2Ref,
    stripRef,
  } = useHeroStory(setStripActive);

  return (
    <section
      ref={containerRef}
      aria-labelledby="hero-title"
      className="relative"
      style={{ height: `${STORY.scrollLengthSvh}svh` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden bg-canvas">
        <div
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.22),transparent_62%)]"
        />

        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 size-full"
        />

        {/*
          Logo berlatar hitam: mix-blend-screen + mask membuat hitamnya
          menyatu dengan latar. Idealnya gunakan PNG transparan.
        */}
        <div
          ref={logoRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 mix-blend-screen mask-[radial-gradient(closest-side,#000_72%,transparent_100%)]"
        >
          <Image
            src="/brand/logo.jpeg"
            alt=""
            fill
            sizes="200px"
            priority
            className="object-contain"
          />
        </div>

        <div
          ref={introRef}
          className="pointer-events-none absolute inset-0 flex flex-col items-center px-6 pt-28 text-center md:pt-32"
        >
          <h1
            id="hero-title"
            className="max-w-3xl text-balance font-display text-3xl font-light tracking-tight sm:text-4xl md:text-5xl"
          >
            Transaction Builder for autonomous agents.
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-xs text-fg-muted sm:text-sm">
            Builds complete Solana agent transaction flows with mandate
            authorization built into the execution path.
          </p>

          {stats.length > 0 && (
            <div className="absolute inset-x-0 bottom-6 hidden px-6 sm:block">
              <HeroStats stats={stats} />
            </div>
          )}
        </div>

        <NodeField nodeRefs={nodeRefs} />

        <StoryCopy
          copy1Ref={copy1Ref}
          copy2Ref={copy2Ref}
        />

        <div
          ref={stripRef}
          className="pointer-events-none absolute inset-x-0 top-[50%] opacity-0 md:top-[56%]"
        >
          <StatsStrip active={stripActive} />
        </div>
      </div>
    </section>
  );
}

export function HeroStory({ stats }: HeroProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <HeroStatic stats={stats} />;
  }

  return <HeroStage stats={stats} />;
}
