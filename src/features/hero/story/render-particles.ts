import {
  BRIGHTNESS,
  LIGHT,
  PALETTE,
  PARTICLES,
} from "./config";
import { clamp, easeInOutCubic, lerp } from "./math";
import type { ParticleField } from "./particles";

export type PointerState = { x: number; y: number; strength: number };

export type DrawState = {
  /** Semua ukuran dalam px CSS. */
  width: number;
  height: number;
  time: number;
  radius: number;
  centerX: number;
  centerY: number;
  /** 0..1: seberapa jauh bola sudah pecah. */
  disperse: number;
  pointer: PointerState;
};

export type ParticleRenderer = {
  draw: (ctx: CanvasRenderingContext2D, state: DrawState) => void;
};

const { binCount } = PALETTE;
const SKIP = 255;
const BIG_BINS = 3;


const BIN_STYLES: readonly string[] = Array.from(
  { length: binCount },
  (_, bin) => {
    const t = (bin + 1) / binCount;

    // Warna dasar ungu dan putih.
    const violet = [139, 92, 246];
    const white = [245, 243, 255];

    const blend = violet.map((v, i) =>
      Math.round(v + ((white[i] ?? v) - v) * t),
    );

    const alpha = lerp(PALETTE.lowAlpha, 1, t);

    return `rgba(${blend[0]},${blend[1]},${blend[2]},${alpha.toFixed(2)})`;
  },
);

export function createParticleRenderer(field: ParticleField): ParticleRenderer {
  const { count, sphere, scatter, delay, keep } = field;

  // Buffer kerja dipakai ulang di setiap frame: tidak ada alokasi saat menggambar.
  const screenX = new Float32Array(count);
  const screenY = new Float32Array(count);
  const bin = new Uint8Array(count);

  const repelRadius = PARTICLES.repelRadius;
  const repelRadiusSq = repelRadius * repelRadius;
  const cosTilt = Math.cos(PARTICLES.tilt);
  const sinTilt = Math.sin(PARTICLES.tilt);

  return {
    draw(ctx, state) {
      const { width, height, time, radius, disperse, pointer } = state;

      ctx.clearRect(0, 0, width, height);

      const angle = time * PARTICLES.rotationSpeed;
      // Cahaya ungu-putih berdenyut dan bergerak.
      const colorWave =
        0.5 + 0.5 * Math.sin(time * 0.8);

      const waveAlpha = 0.82 + colorWave * 0.18;
      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);

      const dispersing = disperse > 0;
      const zoomedRadius = radius * (1 + PARTICLES.zoom * disperse * disperse);
      const originY = lerp(state.centerY, height / 2, easeInOutCubic(disperse));
      const spreadX = width * 0.56;
      const spreadY = height * 0.56;
      const mouseActive = pointer.strength > 0.01;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const x0 = sphere[i3];
        const y0 = sphere[i3 + 1];
        const z0 = sphere[i3 + 2];

        // Putar mengelilingi sumbu Y, lalu miringkan sedikit pada sumbu X.
        const rx = x0 * cosY + z0 * sinY;
        const rzY = -x0 * sinY + z0 * cosY;
        const ry = y0 * cosTilt - rzY * sinTilt;
        const rz = y0 * sinTilt + rzY * cosTilt; // positif = menghadap penonton

        const seed = delay[i];
        const e = dispersing
          ? easeInOutCubic(clamp((disperse - seed * 0.45) / 0.55))
          : 0;

        // Kecerahan: cahaya dari atas + tepi bola lebih terang, sisi belakang redup.
        const lambert = Math.max(0, rx * LIGHT.x + ry * LIGHT.y + rz * LIGHT.z);
        let brightness =
          BRIGHTNESS.base +
          BRIGHTNESS.lambert * lambert +
          BRIGHTNESS.rim * (1 - Math.abs(rz));
        if (rz < 0) brightness *= BRIGHTNESS.back;

        if (e > 0) {
          const twinkle = 0.85 + 0.15 * Math.sin(time * 1.4 + seed * 50);
          const star = (BRIGHTNESS.starMin + BRIGHTNESS.starRange * seed) * twinkle;
          brightness = lerp(brightness, star, e);
        }

        const alpha = keep[i] === 1 ? 1 : 1 - e;
        const level = Math.floor(brightness * alpha * binCount);
        if (level <= 0) {
          bin[i] = SKIP;
          continue;
        }

        const driftPhase = time * 0.12 + seed * 6.283;
        let x = lerp(
          state.centerX + rx * zoomedRadius,
          width / 2 + scatter[i3] * spreadX + Math.cos(driftPhase) * 8,
          e,
        );
        let y = lerp(
          originY - ry * zoomedRadius,
          height / 2 + scatter[i3 + 1] * spreadY + Math.sin(driftPhase) * 8,
          e,
        );

        if (mouseActive) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < repelRadiusSq) {
            const dist = Math.sqrt(distSq);
            const falloff = 1 - dist / repelRadius;

            // Partikel tertarik mengikuti pergerakan mouse.
            const pull = falloff * falloff * 0.45 * pointer.strength;

            x -= dx * pull;
            y -= dy * pull;
          }
        }

        if (x < -2 || x > width + 2 || y < -2 || y > height + 2) {
          bin[i] = SKIP;
          continue;
        }

        screenX[i] = x;
        screenY[i] = y;
        bin[i] = Math.min(level, binCount) - 1;
      }

      for (let b = 0; b < binCount; b++) {
        const size = b >= binCount - BIG_BINS ? PARTICLES.bigSize : PARTICLES.size;

        ctx.globalAlpha = waveAlpha;
        ctx.fillStyle = BIN_STYLES[b];
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (bin[i] === b) ctx.rect(screenX[i], screenY[i], size, size);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}