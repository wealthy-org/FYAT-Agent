const STEPS = [
  { number: "01", label: "Get test funds", href: "#playground-funds" },
  { number: "02", label: "Configure mandate", href: "#playground-configure" },
  { number: "03", label: "Create mandate", href: "#playground-create" },
  { number: "04", label: "Simulate", href: "#playground-simulate" },
  { number: "05", label: "Execute", href: "#playground-execute" },
  { number: "06", label: "Inspect & code", href: "#playground-review" },
] as const;

export function PlaygroundStepNav() {
  return (
    <nav
      aria-label="Suggested playground steps"
      className="border-border-subtle bg-surface/70 rounded-2xl border p-4 md:p-5"
    >
      <p className="text-fg-subtle mb-3 font-mono text-[10px] tracking-[0.16em] uppercase">
        Suggested order
      </p>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STEPS.map((step) => (
          <li key={step.href}>
            <a
              href={step.href}
              className="group hover:border-brand-400/30 hover:bg-brand-500/10 focus-visible:border-brand-400 flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-2 py-2 transition focus-visible:outline-none"
            >
              <span className="border-border-strong bg-surface-raised text-fg-muted group-hover:border-brand-400/50 group-hover:text-brand-300 flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition">
                {step.number}
              </span>
              <span className="text-fg-muted group-hover:text-fg text-xs font-medium">
                {step.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
