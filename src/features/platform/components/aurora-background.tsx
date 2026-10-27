import type { CSSProperties } from "react";

type Blob = {
  left: string;
  top: string;
  size: string;
  color: string;
  duration: string;
  delay: string;
  dx: string;
  dy: string;
  scale: string;
};

/** Warna dan posisi disetel dari video: lavender dengan sorotan pucat dan violet. */
const BLOBS: readonly Blob[] = [
  { left: "-20%", top: "-25%", size: "80%", color: "#efeaff", duration: "21s", delay: "0s", dx: "10%", dy: "8%", scale: "1.15" },
  { left: "45%", top: "0%", size: "75%", color: "#8b7bff", duration: "26s", delay: "-7s", dx: "-12%", dy: "10%", scale: "1.1" },
  { left: "-12%", top: "48%", size: "70%", color: "#cfe3ff", duration: "24s", delay: "-3s", dx: "12%", dy: "-8%", scale: "1.18" },
  { left: "35%", top: "52%", size: "68%", color: "#b69cff", duration: "28s", delay: "-12s", dx: "-10%", dy: "-10%", scale: "1.08" },
  { left: "18%", top: "18%", size: "46%", color: "rgb(255 255 255 / 0.6)", duration: "18s", delay: "-5s", dx: "14%", dy: "12%", scale: "1.2" },
];

type AuroraBackgroundProps = {
  /** true = animasi dihentikan (panel di luar layar). */
  paused: boolean;
};

export function AuroraBackground({ paused }: AuroraBackgroundProps) {
  return (
    <div aria-hidden="true" data-paused={paused} className="aurora">
      {BLOBS.map((blob) => (
        <span
          key={blob.color}
          className="aurora-blob"
          style={
            {
              left: blob.left,
              top: blob.top,
              width: blob.size,
              height: blob.size,
              "--blob-color": blob.color,
              "--blob-duration": blob.duration,
              "--blob-delay": blob.delay,
              "--blob-dx": blob.dx,
              "--blob-dy": blob.dy,
              "--blob-scale": blob.scale,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}