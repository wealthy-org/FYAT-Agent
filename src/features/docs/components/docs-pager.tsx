import Link from "next/link";

type PagerLink = { href: string; label: string };

type DocsPagerProps = {
  prev?: PagerLink;
  next?: PagerLink;
};

const cardClass =
  "block rounded-xl border border-border-subtle px-5 py-4 transition-colors duration-200 hover:border-border-strong hover:bg-white/[0.04]";

export function DocsPager({ prev, next }: DocsPagerProps) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-12 grid grid-cols-1 gap-3 border-t border-border-subtle pt-6 sm:mt-16 sm:grid-cols-2 sm:gap-4 sm:pt-8"
    >
      {prev ? (
        <Link href={prev.href} className={cardClass}>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Previous
          </span>
          <span className="mt-1 block text-sm text-fg">{prev.label}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}

      {next ? (
        <Link href={next.href} className={`${cardClass} text-right`}>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Next
          </span>
          <span className="mt-1 block text-sm text-fg">{next.label}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}