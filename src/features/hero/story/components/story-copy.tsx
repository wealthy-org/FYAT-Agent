
import type { RefObject } from "react";
import { ArrowRight } from "lucide-react";

import { storyCopy } from "../data";

const workflowSteps = storyCopy.second.flow.split(" → ");

type StoryCopyProps = {
  copy1Ref: RefObject<HTMLDivElement | null>;
  copy2Ref: RefObject<HTMLDivElement | null>;
};

export function StoryCopy({ copy1Ref, copy2Ref }: StoryCopyProps) {
  return (
    <>
      <div
        ref={copy1Ref}
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 text-center opacity-0 sm:px-6"
      >
        <div className="flex w-[min(100%,22rem)] flex-col items-center rounded-2xl border border-white/10 bg-canvas/90 px-5 py-5 shadow-[0_16px_48px_-20px_rgb(0_0_0/0.8)] backdrop-blur-md md:w-auto md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
          <h2 className="max-w-xl text-balance font-display text-2xl font-light tracking-tight sm:text-3xl md:text-5xl">
            {storyCopy.first.title}
          </h2>

          <p className="mt-3 max-w-md text-pretty text-[13px] leading-relaxed text-fg-muted sm:mt-5 sm:text-sm md:text-base">
            {storyCopy.first.body}
          </p>
        </div>
      </div>

      <div
        ref={copy2Ref}
        className="pointer-events-none absolute inset-x-0 top-[7%] z-20 flex items-center justify-center px-4 text-center opacity-0 sm:px-6 md:inset-0 md:top-auto"
      >
        <div className="flex w-[min(100%,22rem)] flex-col items-center rounded-2xl border border-white/10 bg-canvas/90 px-4 py-4 shadow-[0_16px_48px_-20px_rgb(0_0_0/0.8)] backdrop-blur-md sm:px-5 sm:py-5 md:w-auto md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
          <p className="mx-auto max-w-xl text-pretty text-[13px] leading-relaxed text-fg-muted sm:text-sm md:text-base">
            {storyCopy.second.body}
          </p>

          <ol className="mt-3 flex flex-row flex-wrap items-center justify-center gap-x-1 gap-y-1 font-mono text-[10px] text-fg sm:mt-4 sm:gap-x-2 sm:gap-y-1.5 sm:text-[11px] md:mt-5 md:gap-2 md:text-xs">
            {workflowSteps.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-1 sm:gap-2"
              >
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 sm:px-3 sm:py-1.5 md:border-0 md:bg-transparent md:px-0 md:py-0">
                  {step}
                </span>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3 shrink-0 text-brand-400"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
