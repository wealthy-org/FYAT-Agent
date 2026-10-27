import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";

import type { FeatureRowData } from "../types";
import { FeatureMock } from "./feature-mock";

type FeatureRowProps = {
  feature: FeatureRowData;
  /** true → panel ilustrasi pindah ke kanan di layar md ke atas. */
  reversed?: boolean;
};

export function FeatureRow({ feature, reversed = false }: FeatureRowProps) {
  const { eyebrow, title, description, pillars, cta, mock } = feature;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border-subtle bg-surface backdrop-blur-md md:grid-cols-2">
      <div
        className={cn(
          "grid place-items-center bg-[radial-gradient(ellipse_at_center,#c4b5fd,#8b5cf6_55%,#c4b5fd)] p-8 md:p-10",
          reversed && "md:order-2",
        )}
      >
        <FeatureMock {...mock} />
      </div>

      <div className="flex flex-col justify-center p-8 md:p-12">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-3 text-balance font-display text-2xl font-medium tracking-tight">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-sm text-fg-muted">{description}</p>

        <ul className="mt-8 grid grid-cols-3 gap-3">
          {pillars.map((pillar) => (
            <li
              key={pillar}
              className="rounded-xl border border-border-subtle bg-surface-raised px-2 py-4 text-center text-xs text-fg-muted"
            >
              {pillar}
            </li>
          ))}
        </ul>

        <Button
          href={cta.href}
          variant="secondary"
          size="sm"
          className="mt-8 self-end"
        >
          {cta.label}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}