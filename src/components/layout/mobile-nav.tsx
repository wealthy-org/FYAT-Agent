"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import type { NavItem } from "@/lib/site";

type MobileNavProps = {
  items: readonly NavItem[];
  actions?: ReactNode;
};

export function MobileNav({ items, actions }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
                className="grid size-11 place-items-center rounded-full border border-border-subtle text-fg"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full border-b border-border-subtle bg-canvas/95 backdrop-blur-md"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex w-[min(1080px,88%)] flex-col gap-1 py-4"
          >
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                                className="rounded-lg px-3 py-3.5 text-base text-fg-muted hover:bg-surface hover:text-fg"
              >
                {item.label}
              </a>
            ))}
            {actions && <div className="mt-3 px-3">{actions}</div>}
          </nav>
        </div>
      )}
    </div>
  );
}