
import type { RefObject } from "react";

import { storyCopy } from "../data";

type StoryCopyProps = {
  copy1Ref: RefObject<HTMLDivElement | null>;
  copy2Ref: RefObject<HTMLDivElement | null>;
};

export function StoryCopy({ copy1Ref, copy2Ref }: StoryCopyProps) {
  return (
    <>
      <div
        ref={copy1Ref}
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center opacity-0"
      >
        <div className="flex flex-col items-center">
          <h2 className="max-w-xl text-balance font-display text-3xl font-light tracking-tight md:text-5xl">
            {storyCopy.first.title}
          </h2>

          <p className="mt-5 max-w-md text-pretty text-sm text-fg-muted md:text-base">
            {storyCopy.first.body}
          </p>
        </div>
      </div>

      <div
        ref={copy2Ref}
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center opacity-0"
      >
        <div className="flex flex-col items-center">
          <p className="mx-auto max-w-xl text-pretty text-sm text-fg-muted md:text-base">
            {storyCopy.second.body}
          </p>

          <p className="mt-5 font-mono text-xs text-fg">
            {storyCopy.second.flow}
          </p>
        </div>
      </div>
    </>
  );
}
