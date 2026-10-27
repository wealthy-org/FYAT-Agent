import type { RefObject } from "react";

import { cn } from "@/lib/cn";

import { storyNodes, type NodeKind } from "../data";

const KIND_CLASSES: Record<NodeKind, string> = {
  accent:
    "bg-brand-500 text-white shadow-[0_0_28px_-6px_rgb(139_92_246/0.7)]",
  ghost: "border border-white/20 bg-white/[0.06] text-fg-muted",
  light: "bg-white text-black",
};

type NodeFieldProps = {
  nodeRefs: RefObject<(HTMLDivElement | null)[]>;
};

/** Dekoratif: posisi dan opasitas diatur oleh loop animasi, bukan React. */
export function NodeField({ nodeRefs }: NodeFieldProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {storyNodes.map((node, index) => (
        <div
          key={node.id}
          ref={(element) => {
            nodeRefs.current[index] = element;
          }}
          className={cn(
            "absolute left-0 top-0 flex items-center justify-center rounded-full font-medium opacity-0 will-change-transform",
            KIND_CLASSES[node.kind],
          )}
          style={{
            width: node.size,
            height: node.size,
            fontSize: Math.max(9, Math.round(node.size * (node.label.length > 3 ? 0.26 : 0.32))),
          }}
        >
          {node.label}
        </div>
      ))}
    </div>
  );
}