import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const variants = {
  default: "border-border-subtle bg-surface",
  glow: "border-border-strong bg-surface-raised shadow-glow",
} as const;

type CardProps = ComponentPropsWithoutRef<"div"> & {
  variant?: keyof typeof variants;
};

export function Card({ variant = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 backdrop-blur-md",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}