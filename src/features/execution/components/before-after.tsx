"use client";

import type { CSSProperties } from "react";

import { Container } from "@/components/layout/container";
import { ToneSection } from "@/components/layout/tone-section";
import { ExecHeading } from "@/components/ui/exec-heading";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";

import { withFyat, withoutFyat, type FlowItem } from "../data";

const STEP_MS = 130;

const itemTones = {
  default: "bg-paper text-ink-muted",
  bad: "bg-rose-100 text-rose-700",
  primary: "bg-brand-600 text-white",
} as const;

type FlowCardProps = {
  title: string;
  items: readonly FlowItem[];
  revealed: boolean;
  baseDelay: number;
  highlight?: boolean;
};

function FlowCard({ title, items, revealed, baseDelay, highlight }: FlowCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-white p-8 transition-shadow duration-700",
        highlight
          ? "border border-brand-500/70 shadow-[0_28px_70px_-24px_rgb(124_58_237/0.5)]"
          : "shadow-[0_14px_44px_-26px_rgb(23_17_42/0.3)]",
      )}
    >
      <h3 className="font-display text-lg">{title}</h3>

      <ol className="mt-6">
        {items.map((item, i) => (
          <li
            key={item.label}
            data-in={revealed}
            className="reveal-sm relative mb-2 not-last:after:absolute not-last:after:left-6 not-last:after:top-full not-last:after:h-2 not-last:after:w-px not-last:after:bg-ink/15"
            style={
              { "--reveal-delay": `${baseDelay + i * STEP_MS}ms` } as CSSProperties
            }
          >
            <div
              className={cn(
                "rounded-lg px-3 py-2.5 font-mono text-xs",
                itemTones[item.tone ?? "default"],
              )}
            >
              {item.label}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BeforeAfter() {
  const { ref, revealed } = useReveal<HTMLDivElement>(0.3);
  const rightDelay = withoutFyat.length * STEP_MS + 250;

  return (
    <ToneSection tone="light" aria-labelledby="compare-title">
      <Container>
        <ExecHeading
          id="compare-title"
          tone="light"
          index="03"
          label="Before and after"
          title="Before FYAT / With FYAT"
        />

        <div ref={ref} className="mt-14 grid items-start gap-4 md:grid-cols-2">
          <FlowCard
            title="Without FYAT"
            items={withoutFyat}
            revealed={revealed}
            baseDelay={0}
          />
          <FlowCard
            title="With FYAT"
            items={withFyat}
            revealed={revealed}
            baseDelay={rightDelay}
            highlight
          />
        </div>
      </Container>
    </ToneSection>
  );
}