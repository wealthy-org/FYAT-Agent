import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import { Container } from "./container";
import { HeaderShell } from "./header-shell";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavMenu } from "./nav-menu";

type HeaderProps = {
  /** Slot di kanan header, diisi tombol Connect Wallet. */
  actions?: ReactNode;
  /** id section tempat header mulai bersembunyi saat scroll turun dan muncul lagi saat scroll naik. */
  hideOnScrollFrom?: string;
};

export function Header({ actions, hideOnScrollFrom }: HeaderProps) {
  return (
    <HeaderShell hideOnScrollFrom={hideOnScrollFrom}>
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Logo />

        <NavMenu items={siteConfig.nav} actions={actions} />

        <MobileNav items={siteConfig.nav} actions={actions} />
      </Container>
    </HeaderShell>
  );
}