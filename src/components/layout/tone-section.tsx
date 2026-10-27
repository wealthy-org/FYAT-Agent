import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

import { Section } from "./section";

const tones = {
  dark: "bg-canvas bg-[radial-gradient(ellipse_at_50%_-10%,rgb(139_92_246/0.14),transparent_60%)] text-fg",
  light: "bg-paper text-ink",
} as const;

export type Tone = keyof typeof tones;

type ToneSectionProps = ComponentPropsWithoutRef<"section"> & { tone: Tone };

export function ToneSection({ tone, className, ...props }: ToneSectionProps) {
  return (
    <Section
      className={cn("py-28 md:py-36", tones[tone], className)}
      {...props}
    />
  );
}