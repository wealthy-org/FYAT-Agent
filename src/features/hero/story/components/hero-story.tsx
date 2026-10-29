
"use client";

import Image from "next/image";
import { useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import { HeroStatic } from "../../components/hero-static";
import { STORY } from "../config";
import { useHeroStory } from "../use-hero-story";
import { NodeField } from "./node-field";
import { StatsStrip } from "./stats-strip";
import { StoryCopy } from "./story-copy";
import { NodeTooltip } from "./node-tooltip";

function HeroStage() {
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
    darkOverlayRef,
    tipRef,
  } = useHeroStory(setStripActive);

  return (
    <section
      ref={containerRef}
      aria-labelledby="hero-title"
      className="relative"
      style={{ height: `${STORY.scrollLengthSvh}svh` }}
    >
      <div className="sticky top-0 isolate h-svh overflow-hidden bg-canvas">
        {/* Background glow */}
        <div
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.22),transparent_62%)]"
        />

        {/* Background gradually darkens during scroll */}
        <div
          ref={darkOverlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-black"
          style={{ opacity: 0 }}
        />

        {/* Particle background */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 size-full"
        />

        {/* Brand logo */}
        <div
          ref={logoRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 mix-blend-screen mask-[radial-gradient(closest-side,#000_72%,transparent_100%)]"
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

        {/* Hero entrance */}
        <div
          ref={introRef}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center px-6 pt-28 text-center md:pt-32"
        >
          <h1
            id="hero-title"
            className="hero-enter-title max-w-3xl text-balance font-display text-3xl font-light tracking-tight sm:text-4xl md:text-5xl"
          >
            Transaction Builder for autonomous agents.
          </h1>

          <p className="hero-enter-description mt-4 max-w-xl text-pretty text-xs text-fg-muted sm:text-sm">
            Builds complete Solana agent transaction flows with mandate
            authorization built into the execution path.
          </p>

        </div>

        {/* Orbiting nodes */}
        <div className="absolute inset-0 z-20">
          <NodeField nodeRefs={nodeRefs} />
        </div>

        {/* Scroll-based story copy */}
        <div className="absolute inset-0 z-20">
          <StoryCopy
            copy1Ref={copy1Ref}
            copy2Ref={copy2Ref}
          />
        </div>

        {/* Stats appear after orbit transition */}
        <div
          ref={stripRef}
          className="pointer-events-none absolute inset-x-0 top-[58%] z-30 opacity-0 md:top-[56%]"
        >
          <StatsStrip active={stripActive} />
          <NodeTooltip tipRef={tipRef} />
        </div>
      </div>
    </section>
  );
}

export function HeroStory() {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <HeroStatic />;
  }

  return <HeroStage />;
}
