export type FeatureRowData = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Tiga pilar singkat yang ditampilkan sebagai kartu kecil. */
  pillars: readonly [string, string, string];
  cta: { label: string; href: string };
  mock: {
    label: string;
    title: string;
    /** Indeks garis (0-3) yang disorot warna brand. */
    highlightedLine: number;
  };
};