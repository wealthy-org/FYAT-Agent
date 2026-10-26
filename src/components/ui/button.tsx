import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-brand-500 text-white shadow-glow hover:bg-brand-400 active:bg-brand-600",
  secondary:
    "border border-border-subtle bg-surface text-fg hover:border-border-strong hover:bg-surface-raised",
  ghost: "text-fg-muted hover:text-fg",
} as const;

const sizes = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
} as const;

type CommonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof CommonProps | "href"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof CommonProps | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const EXTERNAL_URL = /^https?:\/\//i;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    ...rest
  } = props;

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium",
    "transition-colors duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (rest.href === undefined) {
    const { type = "button", ...buttonProps } =
      rest as Omit<ButtonAsButton, keyof CommonProps>;
    return (
      <button type={type} className={classes} {...buttonProps}>
        {children}
      </button>
    );
  }

  const { href, ...linkProps } = rest as Omit<ButtonAsLink, keyof CommonProps>;

  if (EXTERNAL_URL.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...linkProps}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...linkProps}>
      {children}
    </Link>
  );
}