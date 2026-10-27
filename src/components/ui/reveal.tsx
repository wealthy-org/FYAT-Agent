"use client";

import type { CSSProperties, ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";

type RevealProps = {
  /** Jeda dalam ms, dipakai untuk efek berurutan (stagger). */
  delay?: number;
  threshold?: number;
  className?: string;
  children: ReactNode;
};

export function Reveal({ delay = 0, threshold, className, children }: RevealProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>(threshold);

  return (
    <div
      ref={ref}
      data-in={revealed}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}