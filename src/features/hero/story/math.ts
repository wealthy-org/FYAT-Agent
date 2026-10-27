export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export const smoothstep = (t: number): number => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Posisi `value` di dalam rentang [start, end], dijepit ke 0..1. */
export function segment(value: number, range: readonly [number, number]): number {
  const [start, end] = range;
  return clamp((value - start) / (end - start));
}

/** PRNG deterministik: bola dan medan bintang sama di setiap muat. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}