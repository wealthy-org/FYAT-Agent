import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false saat SSR dan hydration pertama, true setelahnya di browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}