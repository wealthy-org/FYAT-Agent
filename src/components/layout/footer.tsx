import { siteConfig } from "@/lib/site";

import { Container } from "./container";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-12 overflow-hidden border-t border-border-subtle bg-canvas">
      <Container className="grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-xs text-fg-muted">
            {siteConfig.tagline}
          </p>
        </div>

        {siteConfig.footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-xs font-medium text-fg">{group.title}</h2>
            <ul className="mt-4 space-y-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-xs text-fg-subtle transition-colors hover:text-fg"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <Container className="border-t border-border-subtle py-6">
        <p className="text-xs text-fg-subtle">{siteConfig.disclaimer}</p>
      </Container>

      {/* Dekoratif: kata raksasa di dasar halaman */}
      <div
        aria-hidden="true"
        className="mb-[-0.18em] select-none text-center font-display font-semibold leading-[0.8] tracking-tighter text-white/4"
        style={{ fontSize: "clamp(96px, 22vw, 300px)" }}
      >
        FYAT
      </div>
    </footer>
  );
}