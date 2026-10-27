import type { ReactNode } from "react";

type DocsShellProps = {
  sidebar: ReactNode;
  toc: ReactNode;
  children: ReactNode;
};

/** Tiga kolom: sidebar kiri, konten, "On this page" kanan. Sidebar dan TOC sticky. */
export function DocsShell({ sidebar, toc, children }: DocsShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-380 gap-14 px-6 pb-24 pt-28 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_220px]">
      <aside className="sticky top-26 hidden h-[calc(100svh-128px)] overflow-y-auto rounded-2xl border border-border-subtle bg-white/3 p-3 lg:block">
        {sidebar}
      </aside>

      <main className="min-w-0 max-w-3xl animate-docs-in motion-reduce:animate-none">{children}</main>

      <aside className="sticky top-26 hidden h-fit xl:block">{toc}</aside>
    </div>
  );
}