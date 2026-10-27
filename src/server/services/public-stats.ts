import "server-only";

import type { HeroStat } from "@/features/hero";

import { getReceiptStats } from "../repositories/receipts";

/** Daftar kosong = statistik disembunyikan. Lebih baik kosong daripada angka palsu. */
export async function getHeroStats(): Promise<readonly HeroStat[]> {
  try {
    const { total, blocked } = await getReceiptStats();

    return [
      { id: "actions-built", label: "Actions Built", value: total },
      {
        id: "transactions-protected",
        label: "Transactions Protected",
        value: blocked,
        highlight: true,
      },
    ];
  } catch (error) {
    console.error("[stats] load failed", error);
    return [];
  }
}