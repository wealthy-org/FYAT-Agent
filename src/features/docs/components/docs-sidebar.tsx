import Link from "next/link";

import { cn } from "@/lib/cn";

import { docsNav } from "../data";

type DocsSidebarProps = {
  activeSlug: string;
};

export function DocsSidebar({ activeSlug }: DocsSidebarProps) {
  return (
    <nav aria-label="Docs" className="space-y-6">
      {docsNav.map((group) => (
        <div key={group.title}>
          <h2 className="px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            {group.title}
          </h2>

          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = item.slug === activeSlug;

              return (
                <li key={item.slug}>
                  <Link
                    href={`/docs/${item.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-[13px] transition-colors duration-200",
                      active
                        ? "bg-brand-500 font-medium text-white"
                        : "text-fg-muted hover:bg-white/6 hover:text-fg",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}