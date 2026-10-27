"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Browser bisa menolak (izin atau konteks tidak aman).
        return false;
      }

      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}