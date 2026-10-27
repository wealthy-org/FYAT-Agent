import { cn } from "@/lib/cn";

import type { FeatureRowData } from "../types";

const LINE_COUNT = 4;

export function FeatureMock({ label, title, highlightedLine }: FeatureRowData["mock"]) {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm rounded-xl bg-canvas p-6 shadow-2xl shadow-black/40"
    >
      <span className="font-mono text-[10px] tracking-widest text-fg-subtle">
        {label}
      </span>
      <p className="my-4 text-balance font-display text-2xl font-medium leading-tight">
        {title}
      </p>
      {Array.from({ length: LINE_COUNT }, (_, index) => (
        <div
          key={index}
          className={cn(
            "my-2 h-2 rounded-sm",
            index === highlightedLine ? "bg-brand-500" : "bg-white/10",
          )}
        />
      ))}
    </div>
  );
}