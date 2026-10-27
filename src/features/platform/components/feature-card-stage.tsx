import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import type { FeatureDetail, FeatureSummary } from "../types";

const LABEL = "font-mono text-[10px] uppercase tracking-[0.15em] text-fg-subtle";

/** Satu lapisan isi. Yang tidak aktif buram dan transparan: crossfade terjadi otomatis. */
function Layer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "absolute inset-0 flex flex-col p-5 transition-[opacity,filter,transform] duration-100 ease-out",
        active
        ? "scale-100 opacity-100 blur-[0px]"
        : "pointer-events-none scale-[0.985] opacity-0 blur-sm",
      )}
    >
      {children}
    </div>
  );
}

function CardFooter() {
  return (
    <div className="mt-auto flex items-center justify-between pt-4 font-mono text-[10px] text-fg-subtle">
      <span>FYAT</span>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-400" />
    </div>
  );
}

type FeatureCardStageProps = {
  summary: FeatureSummary;
  detailLabel: string;
  details: readonly FeatureDetail[];
  /** null = tampilkan ringkasan. */
  activeId: string | null;
  /** true sebentar saat isi berganti: kartu berubah menjadi kaca buram. */
  transitioning: boolean;
};

export function FeatureCardStage({
  summary,
  detailLabel,
  details,
  activeId,
  transitioning,
}: FeatureCardStageProps) {
  return (
    <div className="relative aspect-4/5 w-[min(74%,300px)] overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10">
      {/* Lapisan kaca: blur hanya aktif selama transisi, karena mahal di atas latar bergerak */}
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 bg-white/15", transitioning && "backdrop-blur-xl")}
      />
      {/* Lapisan padat: menipis sebentar sehingga kaca terlihat */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-[#101012] transition-opacity duration-50",
          transitioning ? "opacity-40" : "opacity-100",
        )}
      />

      <Layer active={activeId === null}>
        <p className={LABEL}>{summary.label}</p>
        <p className="mt-4 text-balance font-display text-2xl font-light leading-tight sm:text-[28px]">
          {summary.title}
        </p>

        <ul className="mt-auto space-y-0.75 pt-4">
          {summary.rows.map((row, index) => (
            <li
              key={row}
              className={cn(
                "rounded-[3px] px-2 py-0.75 font-mono text-[8px]",
                index === summary.highlightedRow
                  ? "bg-brand-500/35 text-white"
                  : "bg-white/5 text-fg-subtle",
              )}
            >
              {row}
            </li>
          ))}
        </ul>

        <CardFooter />
      </Layer>

      {details.map((detail) => (
        <Layer key={detail.id} active={activeId === detail.id}>
          <p className={LABEL}>{detailLabel}</p>
          <p className="mt-4 text-balance font-display text-2xl font-light leading-tight">
            {detail.title}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-fg-muted">
            {detail.body}
          </p>
          <CardFooter />
        </Layer>
      ))}
    </div>
  );
}