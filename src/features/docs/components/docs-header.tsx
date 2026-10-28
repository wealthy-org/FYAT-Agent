"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { ConnectWalletButton } from "@/features/wallet";
import { cn } from "@/lib/cn";

import { allDocs } from "../data";

const links = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/builder-overview", label: "App" },
] as const;

export function DocsHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/docs"
      ? pathname.startsWith("/docs") &&
        !pathname.startsWith("/docs/playground") &&
        !pathname.startsWith("/docs/live-receipts")
      : pathname === href;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allDocs
      .filter((d) => d.label.toLowerCase().includes(q) || d.group.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const go = (slug: string) => {
    setQuery("");
    router.push(`/docs/${slug}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border-subtle/50 bg-canvas/70 backdrop-blur-md">
    <Container size="wide" className="flex h-20 items-center gap-8">
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
          className="relative hidden w-full max-w-xs sm:block"
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
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-fg-muted hover:bg-white/6 hover:text-fg"
                  >
                    {doc.label}
                    <span className="text-[10px] text-fg-subtle">{doc.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <nav aria-label="Primary" className="ml-auto flex items-center gap-6">
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
      </Container>
    </header>
  );
}