import { HeroStory } from "../story/components/hero-story";
import type { HeroStat } from "../types";

type HeroSectionProps = {
  stats: readonly HeroStat[];
};

/** Pintu masuk hero. Memilih versi animasi atau statis (reduced motion) di sisi klien. */
export function HeroSection({ stats }: HeroSectionProps) {
  return <HeroStory stats={stats} />;
}