"use client";

import { useEffect, useRef } from "react";

import { useInView } from "@/hooks/use-in-view";

/** Kecepatan rata-rata geseran. Makin kecil = makin pelan. */
const SPEED_PX_PER_S = 48;
const MIN_DURATION_MS = 2500;
const MAX_DURATION_MS = 8000;
/** Batas jarak geser, supaya baris dengan banyak tab tidak berjalan terlalu lama. */
const MAX_DISTANCE_PX = 360;
/** Jeda setelah deretan terlihat, supaya mata sempat melihat posisi awal. */
const DELAY_MS = 400;
const MIN_OVERFLOW_PX = 8;

/** easeInOutSine: mulai dan berhenti lembut, tengahnya mengalir. */
const EASING = "cubic-bezier(0.37, 0, 0.63, 1)";

/** Interaksi yang menghentikan geseran di posisi saat ini. */
const TAKEOVER_EVENTS = [
  "pointerdown",
  "pointerenter",
  "wheel",
  "touchstart",
  "keydown",
  "focusin",
] as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Menggeser isi deretan secara pelan dan halus satu kali saat terlihat.
 * - scrollerRef: kontainer overflow (yang di-scroll)
 * - trackRef: pembungkus isi di dalamnya (yang dianimasikan dengan transform)
 */
export function useSlideIntro<T extends HTMLElement>() {
  const { ref: scrollerRef, inView } = useInView<T>({
    rootMargin: "0px",
    threshold: 0.6,
  });
  const trackRef = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!inView || !scroller || !track || played.current) return;
    if (typeof track.animate !== "function") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      played.current = true;
      return;
    }

    const from = scroller.scrollLeft;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    if (maxScroll - from < MIN_OVERFLOW_PX) return;

    // Jarak bulat: posisi akhir animasi sama persis dengan posisi scroll asli.
    const to = Math.round(Math.min(maxScroll, from + MAX_DISTANCE_PX));
    const distance = to - from;
    const duration = clamp(
      (distance / SPEED_PX_PER_S) * 1000,
      MIN_DURATION_MS,
      MAX_DURATION_MS,
    );

    const animation = track.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(${-distance}px, 0, 0)` },
      ],
      { duration, delay: DELAY_MS, easing: EASING, fill: "forwards" },
    );

    let settled = false;

    const detach = () => {
      for (const type of TAKEOVER_EVENTS) {
        scroller.removeEventListener(type, settle);
      }
    };

    /** Serahkan posisi saat ini ke scroll asli, lalu hentikan animasi. */
    function settle() {
      if (settled) return;
      settled = true;

      const transform = getComputedStyle(track!).transform;
      const offset =
        transform === "none" ? 0 : -new DOMMatrixReadOnly(transform).m41;

      scroller!.scrollLeft = from + Math.round(offset);
      animation.cancel();
      played.current = true;
      detach();
    }

    animation.onfinish = settle;
    for (const type of TAKEOVER_EVENTS) {
      scroller.addEventListener(type, settle, { passive: true });
    }

    return () => {
      detach();
      // Keluar layar atau unmount sebelum selesai: batalkan, nanti diulang dari awal.
      if (!settled) animation.cancel();
    };
  }, [inView, scrollerRef]);

  return { scrollerRef, trackRef };
}