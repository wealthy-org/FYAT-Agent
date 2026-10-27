import type { ReactNode } from "react";

type DocsHeadingProps = {
  /** Dipakai untuk anchor dan scroll-spy di TOC kanan. */
  id: string;
  children: ReactNode;
};

export function DocsHeading({ id, children }: DocsHeadingProps) {
  return (
    <h2
      id={id}
      className="mt-14 flex scroll-mt-28 items-center gap-4 font-display text-2xl font-light tracking-tight"
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-linear-to-r from-white/15 to-transparent"
      />
    </h2>
  );
}