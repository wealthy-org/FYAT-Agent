import type { ReactNode } from "react";

export function DocsCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-3 text-[13px] leading-relaxed text-fg-muted [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_strong]:font-medium [&_strong]:text-fg">
      {children}
    </div>
  );
}