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
  const navActions = (
    <div className="flex items-center gap-3">
      <a
        href="https://x.com/fyatbuilders"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow FYAT on X (opens in a new tab)"
        title="Follow FYAT on X"
        className="grid size-11 shrink-0 place-items-center rounded-full border border-border-subtle text-fg-muted transition-colors hover:border-border-strong hover:bg-surface-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.31 17.403Z" />
        </svg>
      </a>
      {actions}
    </div>
  );

  return (
    <HeaderShell hideOnScrollFrom={hideOnScrollFrom}>
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Logo />

        <NavMenu items={siteConfig.nav} actions={navActions} />

        <MobileNav items={siteConfig.nav} actions={navActions} />
      </Container>
    </HeaderShell>
  );
}