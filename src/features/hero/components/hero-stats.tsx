import { Fragment } from "react";

import { cn } from "@/lib/cn";

import type { HeroStat } from "../types";
import { AnimatedCounter } from "./animated-counter";

type HeroStatsProps = {
  stats: readonly HeroStat[];
};

export function HeroStats({ stats }: HeroStatsProps) {
  return (
    <ul className="mx-auto flex w-fit items-center gap-6 rounded-xl border border-border-subtle bg-surface px-8 py-6 shadow-glow backdrop-blur-md sm:gap-10">
      {stats.map((stat, index) => (
        <Fragment key={stat.id}>
          {index > 0 && (
            <li aria-hidden="true" className="text-xl text-brand-400">
              +
            </li>
          )}
          <li className="text-center">
            <AnimatedCounter
              value={stat.value}
              className={cn(
                "block font-display text-3xl font-medium tabular-nums sm:text-4xl",
                stat.highlight && "text-brand-400",
              )}
            />
            <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              {stat.label}
            </span>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}