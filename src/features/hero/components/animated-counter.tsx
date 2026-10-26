"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 1200;

// Locale dikunci agar server dan client menghasilkan format yang sama.
const formatter = new Intl.NumberFormat("en-US");

type AnimatedCounterProps = {
  value: number;
  className?: string;
};

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  // Mulai dari nilai akhir: tanpa JS atau saat SSR, angka yang benar tetap tampil.
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span aria-hidden="true" className={className}>
        {formatter.format(display)}
      </span>
      <span className="sr-only">{formatter.format(value)}</span>
    </>
  );
}