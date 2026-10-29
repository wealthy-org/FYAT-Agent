import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Section({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn("scroll-mt-20 py-16 sm:py-20 md:scroll-mt-24 md:py-28", className)}
      {...props}
    />
  );
}