"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Sama dengan h-16 pada header. */
const HEADER_HEIGHT = 80;

/** Gerakan di bawah ini diabaikan supaya header tidak berkedip. */
const THRESHOLD = 6;

type HeaderShellProps = {
  /** id section tempat header mulai bersembunyi saat scroll turun. */
  hideOnScrollFrom?: string;
  children: ReactNode;
};

export function HeaderShell({ hideOnScrollFrom, children }: HeaderShellProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!hideOnScrollFrom) return;

    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const section = document.getElementById(hideOnScrollFrom);
      const active = section
        ? section.getBoundingClientRect().top <= HEADER_HEIGHT
        : false;
      const delta = y - lastY;

      if (!active) {
        setHidden(false);
        lastY = y;
        return;
      }

      if (Math.abs(delta) < THRESHOLD) return;

      setHidden(delta > 0); // turun = sembunyi, naik = muncul
      lastY = y;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [hideOnScrollFrom]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-border-subtle/50 bg-canvas/70 backdrop-blur-md",
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        // Tetap tampil saat menu atau tombol di dalamnya sedang fokus.
        "focus-within:translate-y-0",
        hidden && "-translate-y-full",
      )}
    >
      {children}
    </header>
  );
}