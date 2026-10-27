export type FeatureSummary = {
  /** Label mono kecil di atas kartu, mis. "EXECUTION PLAN". */
  label: string;
  title: string;
  rows: readonly string[];
  /** Indeks baris yang disorot warna brand. */
  highlightedRow: number;
};

export type FeatureDetail = {
  id: string;
  /** Dipakai sebagai label tab dan judul kartu detail. */
  title: string;
  body: string;
};

export type FeatureRowData = {
  id: string;
  title: string;
  description: string;
  bullets: readonly string[];
  summary: FeatureSummary;
  /** Label mono kartu detail, mis. "BUILDER". */
  detailLabel: string;
  details: readonly FeatureDetail[];
  cta: { label: string; href: string };
};