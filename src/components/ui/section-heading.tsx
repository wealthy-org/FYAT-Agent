import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Eyebrow } from "./eyebrow";

type SectionHeadingProps = {
  /** id untuk h2, dipakai oleh aria-labelledby di Section. */
  id: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12 max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight md:text-4xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty text-sm text-fg-muted md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}