import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type DocsShellProps = {
  sidebar: ReactNode;
  /** Kolom "On this page". Diabaikan saat `wide`. */
  toc?: ReactNode;
  /** Untuk halaman interaktif (playground, receipts): konten selebar mungkin. */
  wide?: boolean;
  children: ReactNode;
};

const layouts = {
  article:
    "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_200px]",
  wide: "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]",
} as const;

/** Sidebar kiri, konten, dan (untuk artikel) "On this page" di kanan. Sidebar dan TOC sticky. */
export function DocsShell({ sidebar, toc, wide = false, children }: DocsShellProps) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-380 gap-8 px-4 pb-16 pt-24 sm:gap-10 sm:px-6 sm:pb-24 sm:pt-28 lg:gap-10",
        wide ? layouts.wide : layouts.article,
      )}
    >
      <aside className="sticky top-26 hidden h-[calc(100svh-128px)] overflow-y-auto rounded-2xl border border-border-subtle bg-white/3 p-3 lg:block">
        {sidebar}
      </aside>

      <main
        className={cn(
          "min-w-0 animate-docs-in motion-reduce:animate-none",
          !wide && "max-w-3xl",
        )}
      >
        {children}
      </main>

      {!wide && toc && (
        <aside className="sticky top-26 hidden h-fit xl:block">{toc}</aside>
      )}
    </div>
  );
}