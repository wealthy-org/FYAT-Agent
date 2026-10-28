import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import { Container } from "./container";
import { HeaderShell } from "./header-shell";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

type HeaderProps = {
  /** Slot di kanan header, diisi tombol Connect Wallet. */
  actions?: ReactNode;
  /** id section tempat header mulai bersembunyi saat scroll turun dan muncul lagi saat scroll naik. */
  hideOnScrollFrom?: string;
};

export function Header({ actions, hideOnScrollFrom }: HeaderProps) {
  return (
    <HeaderShell hideOnScrollFrom={hideOnScrollFrom}>
      <Container className="flex h-20 items-center justify-between">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-10 md:flex">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          {actions}
        </nav>

        <MobileNav items={siteConfig.nav} actions={actions} />
      </Container>
    </HeaderShell>
  );
}