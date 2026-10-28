"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/site";

const spring = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
} as const;

type NavMenuProps = {
  items: readonly NavItem[];
  actions?: ReactNode;
};

export function NavMenu({ items, actions }: NavMenuProps) {
  const [active, setActive] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : spring;
  const close = () => setActive(null);

  return (
    <nav
      aria-label="Primary"
      onMouseLeave={close}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      className="hidden items-center gap-1 md:flex"
    >
      {items.map((item) => {
        const children = "children" in item ? item.children : undefined;
        const isActive = active === item.href;

        return (
          <div
            key={item.href}
            className="relative"
            onMouseEnter={() => setActive(item.href)}
            onFocus={() => setActive(item.href)}
          >
            <Link
              href={item.href}
              className={cn(
                "block rounded-full px-4 py-2 text-sm transition-colors duration-200",
                isActive ? "bg-white/6 text-fg" : "text-fg-muted",
              )}
            >
              {item.label}
            </Link>

            {active !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={transition}
              >
                {isActive && children && (
                  // pt-6 = jembatan transparan supaya hover tidak putus antara link dan panel
                  <div className="absolute left-1/2 top-full -translate-x-1/2 pt-6">
                    <motion.div
                      layoutId="nav-menu-panel"
                      transition={transition}
                      className="overflow-hidden rounded-2xl border border-border-subtle bg-canvas-deep shadow-2xl"
                    >
                      <motion.ul layout className="grid w-72 gap-1 p-2">
                        {children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={close}
                              className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/6"
                            >
                              <span className="block text-sm text-fg">{child.label}</span>
                              <span className="mt-0.5 block text-xs text-fg-subtle">
                                {child.description}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        );
      })}

      {/* Hover ke tombol aksi menutup dropdown */}
      <div className="ml-4" onMouseEnter={close}>
        {actions}
      </div>
    </nav>
  );
}