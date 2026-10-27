"use client";

import { useEffect, useRef, useState } from "react";

type InViewOptions = {
  rootMargin?: string;
  /** Bagian elemen (0..1) yang harus terlihat agar dianggap "in view". */
  threshold?: number;
};

/** `inView` true selama elemen berada di (atau dekat) layar. */
export function useInView<T extends Element>({
  rootMargin = "120px",
  threshold = 0,
}: InViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return { ref, inView };
}