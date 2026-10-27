"use client";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/cn";

import { useFeaturePreview } from "../hooks/use-feature-preview";
import type { FeatureRowData } from "../types";
import { AuroraBackground } from "./aurora-background";
import { FeatureCardStage } from "./feature-card-stage";
import { FeatureTabs } from "./feature-tabs";

type FeatureRowProps = {
  feature: FeatureRowData;
  /** true → panel gradien pindah ke kanan di layar md ke atas. */
  reversed?: boolean;
};

export function FeatureRow({ feature, reversed = false }: FeatureRowProps) {
  const { title, description, bullets, summary, detailLabel, details, cta } =
    feature;

  const preview = useFeaturePreview();
  const { ref: mediaRef, inView } = useInView<HTMLDivElement>();

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border-subtle bg-white/[0.035] md:grid-cols-2">
      <div
        ref={mediaRef}
        className={cn(
          "relative grid min-h-85 place-items-center p-8 md:min-h-105 md:p-12",
          reversed && "md:order-2",
        )}
      >
        <AuroraBackground paused={!inView} />
        <FeatureCardStage
          summary={summary}
          detailLabel={detailLabel}
          details={details}
          activeId={preview.activeId}
          transitioning={preview.transitioning}
        />
      </div>

      <div className="flex min-w-0 flex-col p-6 md:p-9">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="mt-3 max-w-md text-sm text-fg-muted">{description}</p>

        <ul className="mt-5 space-y-1.5 text-sm text-fg-muted">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span aria-hidden="true">–</span>
              {bullet}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <FeatureTabs
            details={details}
            activeId={preview.activeId}
            pinnedId={preview.pinnedId}
            onPreview={preview.preview}
            onEndPreview={preview.endPreview}
            onTogglePin={preview.togglePin}
          />

          <div className="mt-4 flex justify-end">
            <Button href={cta.href} variant="secondary" size="sm">
              {cta.label}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}