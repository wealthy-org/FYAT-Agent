"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export type InspectedMandateDto = {
  id: string;
  mandatePda: string;
  onchainId: string;
  sessionPubkey: string;
  recipient: string;
  maxPerAction: string;
  maxTotal: string;
  spent: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED" | "UNVERIFIED";
  chainVerified: boolean;
  dbInSync: boolean;
};

const FAILED = "Gagal memuat mandate.";

async function fetchMandates(owner: string): Promise<InspectedMandateDto[]> {
  const res = await fetch(
    `/api/mandates?owner=${encodeURIComponent(owner)}&limit=30`,
    { cache: "no-store" },
  );
  const json = (await res.json()) as {
    mandates?: InspectedMandateDto[];
    error?: { message?: string };
  };
  if (!res.ok || !json.mandates) {
    throw new Error(json.error?.message ?? FAILED);
  }
  return json.mandates;
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : FAILED);

export function useMandateList() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? null;

  const [items, setItems] = useState<InspectedMandateDto[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Muat awal dan saat wallet berganti. setState hanya di dalam callback promise,
  // dan hasil request lama diabaikan bila wallet sudah berganti.
  useEffect(() => {
    if (!owner) return;

    let cancelled = false;
    fetchMandates(owner)
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        setError("");
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(messageOf(e));
      });

    return () => {
      cancelled = true;
    };
  }, [owner]);

  // Muat ulang manual (event handler, bukan effect).
  const refresh = useCallback(async () => {
    if (!owner) return;
    setRefreshing(true);
    try {
      setItems(await fetchMandates(owner));
      setError("");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRefreshing(false);
    }
  }, [owner]);

  return {
    connected: owner !== null,
    // Saat wallet terputus, daftar lama tidak ditampilkan.
    items: owner ? items : null,
    error: owner ? error : "",
    refreshing,
    refresh,
  };
}