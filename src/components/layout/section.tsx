import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Section({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn("scroll-mt-20 py-24 md:py-28", className)}
      {...props}
    />
  );
}