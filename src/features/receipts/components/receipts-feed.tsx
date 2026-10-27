"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { fetchReceiptPage } from "../api";
import type { ReceiptDto, ReceiptPageDto } from "../types";
import { ReceiptsTable } from "./receipts-table";

export function ReceiptsFeed({ initial }: { initial: ReceiptPageDto }) {
  const [items, setItems] = useState<readonly ReceiptDto[]>(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

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
        return [...previous, ...page.items.filter((item) => !seen.has(item.id))];
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
        {failed && (
          <p className="text-xs text-danger">
            Could not load more receipts. Please try again.
          </p>
        )}
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