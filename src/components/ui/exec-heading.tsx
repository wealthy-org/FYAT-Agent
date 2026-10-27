import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Reveal } from "./reveal";

type ExecHeadingProps = {
  id: string;
  index: string;
  label: string;
  title: ReactNode;
  description?: string;
  tone: "dark" | "light";
  className?: string;
};

export function ExecHeading({
  id,
  index,
  label,
  title,
  description,
  tone,
  className,
}: ExecHeadingProps) {
  const dark = tone === "dark";

  return (
    <div className={cn("max-w-2xl", className)}>
      <Reveal>
        <p
          className={cn(
            "flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em]",
            dark ? "text-fg-subtle" : "text-ink-muted",
          )}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgb(139_92_246/0.22)]"
          />
          {index} · {label}
        </p>
      </Reveal>

      <Reveal delay={90}>
        <h2
          id={id}
          className="mt-5 text-balance font-display text-4xl font-normal tracking-[-0.035em] md:text-6xl"
        >
          {title}
        </h2>
      </Reveal>

      {description && (
        <Reveal delay={180}>
          <p
            className={cn(
              "mt-6 max-w-md text-pretty text-sm md:text-base",
              dark ? "text-fg-muted" : "text-ink-muted",
            )}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}