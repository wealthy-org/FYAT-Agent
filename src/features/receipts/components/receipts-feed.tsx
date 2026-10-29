"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { fetchReceiptPage } from "../api";
import type { ReceiptDto, ReceiptPageDto } from "../types";
import { ReceiptsTable } from "./receipts-table";

const REFRESH_INTERVAL_MS = 15_000;

export function ReceiptsFeed({ initial }: { initial: ReceiptPageDto | null }) {
  const [items, setItems] = useState<readonly ReceiptDto[]>(
    initial?.items ?? [],
  );
  const [cursor, setCursor] = useState(initial?.nextCursor ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const refreshController = useRef<AbortController | null>(null);
  const refreshInFlight = useRef(false);

  const refreshLatest = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    const current = new AbortController();
    refreshController.current = current;
    setRefreshing(true);

    try {
      const page = await fetchReceiptPage(null, current.signal);

      setItems((previous) => {
        const latestIds = new Set(page.items.map((item) => item.id));
        return [
          ...page.items,
          ...previous.filter((item) => !latestIds.has(item.id)),
        ];
      });
      setCursor((previous) => previous ?? page.nextCursor);
      setFailed(false);
    } catch {
      if (!current.signal.aborted) setFailed(true);
    } finally {
      if (!current.signal.aborted) {
        refreshInFlight.current = false;
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshLatest();
    }, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshLatest();
    }, REFRESH_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshLatest();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      controller.current?.abort();
      refreshController.current?.abort();
      refreshInFlight.current = false;
    };
  }, [refreshLatest]);

  const loadMore = async () => {
    if (!cursor || loading) return;

    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setFailed(false);

    try {
      const page = await fetchReceiptPage(cursor, current.signal);

      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [
          ...previous,
          ...page.items.filter((item) => !seen.has(item.id)),
        ];
      });
      setCursor(page.nextCursor);
    } catch {
      if (!current.signal.aborted) setFailed(true);
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  };

  return (
    <>
      <ReceiptsTable items={items} />

      <div aria-live="polite" className="mt-6 flex flex-col items-center gap-3">
        <p className="text-fg-subtle text-xs">
          Live receipts refresh automatically every 15 seconds.
        </p>
        {failed && (
          <p role="status" className="text-danger text-xs">
            Could not refresh receipts. Please try again.
          </p>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refreshLatest()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
        {cursor && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadMore()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </>
  );
}
