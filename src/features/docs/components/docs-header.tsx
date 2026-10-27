"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

import { allDocs } from "../data";

export function DocsHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");

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
      <Container size="wide" className="flex h-16 items-center gap-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full border border-border-subtle px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">
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
            className="h-10 w-full rounded-full border border-border-subtle bg-white/4 pl-10 pr-4 text-xs text-fg placeholder:text-fg-subtle focus:border-brand-400 focus:outline-none"
          />

          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-12 overflow-hidden rounded-xl border border-border-subtle bg-canvas/95 p-1 backdrop-blur-md">
              {results.map((doc) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => go(doc.slug)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-fg-muted hover:bg-white/6 hover:text-fg"
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
          <Link href="/" className="hidden text-xs text-fg-muted transition-colors hover:text-fg md:block">Home</Link>
          <Link href="/docs" className="hidden text-xs text-fg md:block">Docs</Link>
          <Link href="/builder" className="hidden text-xs text-fg-muted transition-colors hover:text-fg md:block">Builder</Link>
          <Button size="sm" href="/builder">Use FYAT</Button>
        </nav>
      </Container>
    </header>
  );
}