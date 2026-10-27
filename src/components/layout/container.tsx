import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const sizes = {
  default: "w-[min(1080px,88%)]",
  /** Untuk area padat seperti Builder Playground. */
  wide: "w-[min(1320px,94%)]",
} as const;

type ContainerProps = ComponentPropsWithoutRef<"div"> & {
  size?: keyof typeof sizes;
};

export function Container({
  size = "default",
  className,
  ...props
}: ContainerProps) {
  return <div className={cn("mx-auto", sizes[size], className)} {...props} />;
}