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
  size?: "md" | "lg";
  className?: string;
};

export function ExecHeading({
  id,
  index,
  label,
  title,
  description,
  tone,
  size = "md",
  className,
}: ExecHeadingProps) {
  const dark = tone === "dark";
  const large = size === "lg";

  return (
    <div className={cn(large ? "max-w-3xl" : "max-w-2xl", className)}>
      <Reveal>
        <p
          className={cn(
            "flex items-center gap-2.5 font-mono uppercase tracking-[0.18em]",
            large ? "text-xs" : "text-[11px]",
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
          className={cn(
            "mt-5 text-balance font-display font-normal tracking-[-0.035em]",
            large ? "text-5xl md:text-7xl" : "text-4xl md:text-6xl",
          )}
        >
          {title}
        </h2>
      </Reveal>

      {description && (
        <Reveal delay={180}>
          <p
            className={cn(
              "mt-6 text-pretty",
              large ? "max-w-xl text-base md:text-lg" : "max-w-md text-sm md:text-base",
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