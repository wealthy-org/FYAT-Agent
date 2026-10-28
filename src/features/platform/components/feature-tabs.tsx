"use client";

import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/cn";

import { useSlideIntro } from "../hooks/use-slide-intro";
import type { FeatureDetail } from "../types";

type FeatureTabsProps = {
  details: readonly FeatureDetail[];
  activeId: string | null;
  pinnedId: string | null;
  onPreview: (id: string) => void;
  onEndPreview: () => void;
  onTogglePin: (id: string) => void;
};

export function FeatureTabs({
  details,
  activeId,
  pinnedId,
  onPreview,
  onEndPreview,
  onTogglePin,
}: FeatureTabsProps) {
  const { scrollerRef, trackRef } = useSlideIntro<HTMLDivElement>();

  // Jenis pointer terakhir: klik mouse tidak mengunci pilihan, ketukan sentuh mengunci.
  const lastPointer = useRef("mouse");

  return (
    <div
      ref={scrollerRef}
      role="group"
      aria-label="Details"
      onPointerLeave={onEndPreview}
      className="-m-1 overflow-x-auto p-1 mask-[linear-gradient(to_right,#000_90%,transparent)] scroll-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
    >
      <div ref={trackRef} className="flex w-max gap-2">
        {details.map((detail) => (
          <button
            key={detail.id}
            type="button"
            aria-pressed={pinnedId === detail.id}
            onPointerDown={(event) => {
              lastPointer.current = event.pointerType;
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") onPreview(detail.id);
            }}
            onFocus={() => onPreview(detail.id)}
            onBlur={onEndPreview}
            onClick={() => {
              if (lastPointer.current !== "mouse") onTogglePin(detail.id);
            }}
            className={cn(
              "relative h-20 w-36 shrink-0 rounded-lg p-3 text-xs transition duration-200 hover:-translate-y-0.5 active:scale-[0.97]",
              activeId === detail.id
                ? "bg-white/16 text-fg"
                : "bg-white/6 text-fg-muted hover:bg-white/12",
            )}
          >
            <ArrowUpRight
              aria-hidden="true"
              className="absolute right-2.5 top-2.5 size-3"
            />
            <span className="flex h-full items-center justify-center text-center">
              {detail.title}
            </span>
            {/* Isi kartu detail tetap bisa dibaca screen reader tanpa hover */}
            <span className="sr-only">: {detail.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}