import { ArrowRight } from "lucide-react";
import { Fragment } from "react";

import { cn } from "@/lib/cn";

import { storyPill, storyStats } from "../data";
import { CountUp } from "./count-up";

type StatsStripProps = {
  active: boolean;
  animate?: boolean;
};

export function StatsStrip({ active, animate = true }: StatsStripProps) {
  return (
    <div className="px-4">
      <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
        Example
      </p>

      <div className="relative mx-auto w-[min(980px,100%)]">
        <ul className="relative grid grid-cols-3 items-center justify-items-center gap-x-2 gap-y-5 rounded-2xl border border-border-subtle bg-white/3 px-3 py-6 backdrop-blur-md sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-6 sm:px-8 sm:py-10">
          {storyStats.map((stat, index) => (
            <Fragment key={stat.id}>
              {index > 0 && (
                <li aria-hidden="true" className="hidden sm:block">
                  <ArrowRight className="size-4 text-brand-400 sm:size-5" />
                </li>
              )}
              <li className="text-center">
                <span
                  className={cn(
                    "block font-display text-4xl font-light tabular-nums sm:text-6xl",
                    "highlight" in stat && stat.highlight
                      ? "text-brand-400"
                      : "bg-linear-to-b from-white to-brand-200 bg-clip-text text-transparent",
                  )}
                >
                  {/* key: pasang ulang tiap `active` berubah → hitung ulang dari 0 */}
                  <CountUp
                    key={String(active)}
                    value={stat.value}
                    active={active}
                    animate={animate}
                    delayMs={index * 150}
                  />
                </span>
                <span className="mt-1 block text-xs text-fg-muted sm:text-sm">
                  {stat.label}
                </span>
              </li>
            </Fragment>
          ))}

          <li aria-hidden="true" className="hidden sm:block">
            <ArrowRight className="size-5 text-brand-400" />
          </li>
          <li className="col-span-3 text-center sm:basis-auto">
            <span className="inline-block rounded-full border border-border-strong bg-brand-500/10 px-5 py-2 text-sm shadow-glow">
              {storyPill}
            </span>
          </li>
        </ul>

        {/* Cahaya di bawah strip */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[8%] -bottom-6 h-14 bg-[radial-gradient(ellipse_at_top,rgb(139_92_246/0.45),transparent_70%)] blur-xl"
        />
      </div>
    </div>
  );
}