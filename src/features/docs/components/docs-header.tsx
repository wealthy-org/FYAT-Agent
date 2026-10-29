"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { ConnectWalletButton } from "@/features/wallet";
import { cn } from "@/lib/cn";

import { allDocs, docsNav } from "../data";

const links = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/builder-overview", label: "App" },
] as const;

export function DocsHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/docs"
      ? pathname.startsWith("/docs") &&
        !pathname.startsWith("/docs/playground") &&
        !pathname.startsWith("/docs/live-receipts")
      : pathname === href;

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allDocs
      .filter((d) => d.label.toLowerCase().includes(q) || d.group.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const go = (slug: string) => {
    setQuery("");
    setMenuOpen(false);
    router.push(`/docs/${slug}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border-subtle/50 bg-canvas/70 backdrop-blur-md">
      <Container size="wide" className="flex h-16 items-center gap-3 sm:h-20 sm:gap-8">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full border border-border-subtle px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Docs
          </span>
        </div>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (results[0]) go(results[0].slug);
          }}
          className="relative hidden w-full max-w-xs md:block"
        >
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the docs"
            aria-label="Search the docs"
            className="h-11 w-full rounded-full border border-border-subtle bg-white/4 pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400 focus:outline-none"
          />

          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-14 overflow-hidden rounded-xl border border-border-subtle bg-canvas/95 p-1 backdrop-blur-md">
              {results.map((doc) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => go(doc.slug)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-fg-muted transition hover:bg-white/6 hover:text-fg active:scale-[0.98]"
                  >
                    {doc.label}
                    <span className="text-[10px] text-fg-subtle">{doc.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hidden text-xs transition-colors md:block",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <ConnectWalletButton />
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="docs-mobile-menu"
          aria-label={menuOpen ? "Close docs menu" : "Open docs menu"}
          className="ml-auto grid size-11 shrink-0 place-items-center rounded-full border border-border-subtle text-fg transition hover:border-border-strong hover:bg-surface-raised active:scale-95 md:hidden"
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </Container>

      {menuOpen && (
        <div
          id="docs-mobile-menu"
          className="max-h-[calc(100svh-4rem)] overflow-y-auto overscroll-contain border-t border-border-subtle/50 bg-canvas/95 px-4 pb-5 backdrop-blur-md sm:max-h-[calc(100svh-5rem)] md:hidden"
        >
          <div className="mx-auto w-full max-w-5xl">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                if (results[0]) go(results[0].slug);
              }}
              className="relative mt-4"
            >
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the docs"
                aria-label="Search the docs"
                className="h-11 w-full rounded-full border border-border-subtle bg-white/4 pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400 focus:outline-none"
              />
              {results.length > 0 && (
                <ul className="absolute inset-x-0 top-12 z-10 overflow-hidden rounded-xl border border-border-subtle bg-canvas p-1 shadow-xl">
                  {results.map((doc) => (
                    <li key={doc.slug}>
                      <button
                        type="button"
                        onClick={() => go(doc.slug)}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-fg-muted transition hover:bg-white/6 hover:text-fg"
                      >
                        <span>{doc.label}</span>
                        <span className="shrink-0 text-[10px] text-fg-subtle">
                          {doc.group}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>

            <nav aria-label="Mobile docs" className="mt-4 grid gap-5">
              <div className="grid grid-cols-2 gap-2">
                {links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "rounded-lg px-3 py-3 text-sm transition hover:bg-white/6",
                        active ? "text-fg" : "text-fg-muted",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {docsNav.map((group) => (
                <section key={group.title}>
                  <h2 className="px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
                    {group.title}
                  </h2>
                  <ul className="mt-1 grid grid-cols-1 gap-1 min-[400px]:grid-cols-2">
                    {group.items.map((item) => {
                      const active = pathname === `/docs/${item.slug}`;
                      return (
                        <li key={item.slug}>
                          <Link
                            href={`/docs/${item.slug}`}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "block min-h-11 rounded-lg px-3 py-3 text-sm transition hover:bg-white/6",
                              active ? "text-fg" : "text-fg-muted",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              <div className="border-t border-border-subtle pt-4">
                <ConnectWalletButton />
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}