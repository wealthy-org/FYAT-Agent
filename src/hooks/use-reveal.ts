"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * `revealed` menjadi true sekali saja saat elemen pertama kali masuk layar,
 * lalu tidak pernah kembali false. Dengan reduced-motion langsung true.
 */
export function useReveal<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (seen) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [seen, threshold]);

  return { ref, revealed: seen || reduced };
}