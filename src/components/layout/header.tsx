import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import { Container } from "./container";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

type HeaderProps = {
  /** Slot di kanan header, nanti diisi tombol Connect Wallet (Step 4). */
  actions?: ReactNode;
};

export function Header({ actions }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border-subtle/50 bg-canvas/70 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs text-fg-muted transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          {actions}
        </nav>

        <MobileNav items={siteConfig.nav} actions={actions} />
      </Container>
    </header>
  );
}