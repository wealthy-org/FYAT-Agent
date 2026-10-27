"use client";

import { useEffect, useState } from "react";

import { clamp, easeOutCubic } from "../math";

const DURATION_MS = 1400;
const formatter = new Intl.NumberFormat("en-US");

type CountUpProps = {
  value: number;
  active: boolean;
  /** false = langsung tampilkan nilai akhir (reduced motion). */
  animate?: boolean;
  delayMs?: number;
};

export function CountUp({
  value,
  active,
  animate = true,
  delayMs = 0,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active || !animate) return;

    const start = performance.now() + delayMs;
    let frame = 0;

    const tick = (now: number) => {
      const t = clamp((now - start) / DURATION_MS);
      setDisplay(Math.round(value * easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, animate, value, delayMs]);

  const shown = animate ? display : value;

  return (
    <>
      <span aria-hidden="true">{formatter.format(shown)}</span>
      <span className="sr-only">{formatter.format(value)}</span>
    </>
  );
}