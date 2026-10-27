import { mulberry32 } from "./math";
import { PARTICLES } from "./config";

export type ParticleField = {
  count: number;
  /** Posisi pada kulit bola (satuan radius), xyz berurutan. Y positif = atas. */
  sphere: Float32Array;
  /** Tujuan setelah menyebar, dinormalisasi -1..1, xyz berurutan. */
  scatter: Float32Array;
  /** Acak 0..1: penundaan menyebar, fase melayang, dan kecerahan bintang. */
  delay: Float32Array;
  /** 1 = tetap tampil sebagai bintang setelah menyebar. */
  keep: Uint8Array;
};

export function createParticleField(count: number, seed: number): ParticleField {
  const rand = mulberry32(seed);

  const sphere = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const delay = new Float32Array(count);
  const keep = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // Titik seragam di permukaan bola, dengan sedikit ketebalan kulit.
    const y = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const shell = 0.9 + rand() * 0.1;

    sphere[i3] = ring * Math.cos(theta) * shell;
    sphere[i3 + 1] = y * shell;
    sphere[i3 + 2] = ring * Math.sin(theta) * shell;

    scatter[i3] = rand() * 2 - 1;
    scatter[i3 + 1] = rand() * 2 - 1;
    scatter[i3 + 2] = rand() * 2 - 1;

    delay[i] = rand();
    keep[i] = rand() < PARTICLES.starRatio ? 1 : 0;
  }

  return { count, sphere, scatter, delay, keep };
}