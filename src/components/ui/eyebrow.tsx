import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Eyebrow({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.2em] text-brand-400",
        className,
      )}
      {...props}
    />
  );
}