"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

type TabsProps = {
  /** Nama grup untuk screen reader. */
  label: string;
  tabs: readonly TabItem[];
};

export function Tabs({ label, tabs }: TabsProps) {
  const baseId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    const targets: Partial<Record<string, number>> = {
      ArrowRight: activeIndex === last ? 0 : activeIndex + 1,
      ArrowLeft: activeIndex === 0 ? last : activeIndex - 1,
      Home: 0,
      End: last,
    };

    const next = targets[event.key];
    if (next === undefined) return;

    event.preventDefault();
    select(next);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="flex gap-6 border-b border-border-subtle"
      >
        {tabs.map((tab, index) => {
          const selected = index === activeIndex;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-xs font-medium transition-colors",
                selected
                  ? "border-brand-400 text-fg"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== activeIndex}
          className="mt-5"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}