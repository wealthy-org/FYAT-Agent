export type HeroStat = {
  /** Kunci stabil untuk React key. */
  id: string;
  label: string;
  value: number;
  /** Beri warna aksen pada angka. */
  highlight?: boolean;
};