"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export type TocItem = { id: string; label: string };

type DocsTocProps = {
  items: readonly TocItem[];
};

export function DocsToc({ items }: DocsTocProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    // Garis pengamat: sedikit di bawah header, di bagian atas layar.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-112px 0px -60% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));

    // Heading terakhir sering tidak sempat lewat garis: aktifkan saat mentok di dasar halaman.
    const onScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      const last = items[items.length - 1];
      if (atBottom && last) setActiveId(last.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  return (
    <nav aria-label="On this page">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
        On this page
      </p>

      <ul className="mt-4 border-l border-white/10">
        {items.map((item) => {
          const active = item.id === activeId;

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l-2 py-1.5 pl-4 text-[13px] transition-colors duration-200",
                  active
                    ? "border-brand-400 text-brand-200"
                    : "border-transparent text-fg-subtle hover:text-fg",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}