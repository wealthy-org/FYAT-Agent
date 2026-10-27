"use client";

import { useEffect, useRef, useState } from "react";

/** Lamanya kartu "berkaca" saat isinya berganti. */
const FROST_MS = 220;

/**
 * Mouse: hover menampilkan detail, kursor pergi mengembalikan ringkasan.
 * Sentuhan: ketuk untuk memilih (pin), ketuk lagi untuk melepas.
 * Keyboard: fokus pada tab menampilkan detailnya.
 */
export function useFeaturePreview() {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pulse = () => {
    setTransitioning(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTransitioning(false), FROST_MS);
  };

  const preview = (id: string) => {
    if (hoverId === id) return;
    setHoverId(id);
    pulse();
  };

  const endPreview = () => {
    if (hoverId === null) return;
    setHoverId(null);
    pulse();
  };

  const togglePin = (id: string) => {
    setPinnedId(pinnedId === id ? null : id);
    pulse();
  };

  return {
    activeId: hoverId ?? pinnedId,
    pinnedId,
    transitioning,
    preview,
    endPreview,
    togglePin,
  };
}