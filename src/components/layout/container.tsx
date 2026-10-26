import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Container({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("mx-auto w-[min(1080px,88%)]", className)}
      {...props}
    />
  );
}