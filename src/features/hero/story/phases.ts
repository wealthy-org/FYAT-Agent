
import { PHASES } from "./config";
import { clamp, segment, smoothstep } from "./math";

export type StoryFrame = {
  intro: { opacity: number; shift: number };
  logo: { opacity: number; scale: number };
  disperse: number;
  nodesDim: number;
  copy1: { opacity: number; shift: number };
  copy2: { opacity: number; shift: number };
  strip: { opacity: number; shift: number };
  stripActive: boolean;
};


export function computeStoryFrame(progress: number): StoryFrame {
  const introOut = smoothstep(segment(progress, PHASES.introOut));
  const logoOut = smoothstep(segment(progress, PHASES.logoOut));
  const copy1In = smoothstep(segment(progress, PHASES.copy1In));
  const copy1Out = smoothstep(segment(progress, PHASES.copy1Out));
  const copy2In = smoothstep(segment(progress, PHASES.copy2In));
  const stripIn = smoothstep(segment(progress, PHASES.strip));

  return {
    intro: {
      opacity: 1 - introOut,
      shift: -48 * introOut,
    },
    logo: {
      opacity: 1 - logoOut,
      scale: 1 + 0.4 * logoOut,
    },
    disperse: segment(progress, PHASES.disperse),
    nodesDim: smoothstep(segment(progress, PHASES.nodesDim)),
    copy1: {
      opacity: copy1In * (1 - copy1Out),
      shift: 0,
    },
    copy2: {
      opacity: copy2In,
      shift: 0,
    },
    strip: {
      opacity: stripIn,
      shift: 90 * (1 - stripIn),
    },
    stripActive: progress >= PHASES.stripActiveAt,
  };
}

/** Kemunculan node satu per satu. */
export function nodeAppear(
  progress: number,
  index: number,
  total: number,
): number {
  const [start, end] = PHASES.nodesIn;
  const offset =
    total > 1
      ? (index / (total - 1)) * PHASES.nodeStagger
      : 0;

  return smoothstep(
    clamp((progress - start - offset) / (end - start)),
  );
}
