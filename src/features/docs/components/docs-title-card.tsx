type DocsTitleCardProps = {
  eyebrow: string;
  title: string;
};

export function DocsTitleCard({ eyebrow, title }: DocsTitleCardProps) {
  return (
    <header>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
        {eyebrow}
      </p>

      <div className="relative mt-4 overflow-hidden rounded-2xl px-5 py-7 sm:px-8 sm:py-9 md:py-11">
        {/* Gradien ungu */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(110deg,rgb(109_58_230),rgb(139_92_246)_55%,rgb(167_139_250))]"
        />
        {/* Pola titik, memudar ke arah kiri */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.4)_1px,transparent_1px)] bg-size-[14px_14px] mask-[linear-gradient(90deg,transparent,#000_70%)]"
        />

        <h1 className="relative font-display text-balance text-3xl font-light tracking-tight text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
      </div>
    </header>
  );
}