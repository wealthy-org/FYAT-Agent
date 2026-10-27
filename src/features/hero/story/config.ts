/** Semua angka penyetelan animasi hero ada di sini. */

export const STORY = {
  /** Panjang scroll total, dalam tinggi viewport (svh). Makin besar = makin lambat. */
  scrollLengthSvh: 520,
  /** Kecepatan mengejar posisi scroll (1/detik). Makin besar = makin responsif. */
  smoothing: 8,
  mobileBreakpoint: 768,
} as const;

/** Rentang progres scroll (0..1) tiap fase. */
export const PHASES = {
  introOut: [0.05, 0.2],
  logoOut: [0.03, 0.14],
  disperse: [0.07, 0.34],
  nodesIn: [0.26, 0.4],
  copy1In: [0.3, 0.38],
  copy1Out: [0.52, 0.6],
  nodesDim: [0.52, 0.64],
  copy2In: [0.57, 0.65],
  strip: [0.62, 0.76],
  /** Penundaan kemunculan antar node, dalam satuan progres. */
  nodeStagger: 0.08,
  /** Seberapa jauh node naik mengikuti scroll (kali tinggi layar). */
  nodeParallax: 0.9,
  /** Seberapa redup node saat teks kedua tampil (0..1). */
  nodeDim: 0.85,
  /** Strip mulai menghitung angka pada progres ini. */
  stripActiveAt: 0.66,
} as const;

export const SPHERE = {
  radiusRatio: 0.165, // kali tinggi panggung
  minRadius: 92,
  maxRadius: 200,
  /** Posisi vertikal pusat bola (0 = atas, 1 = bawah). */
  centerY: 0.63,
  logoScale: 0.86, // lebar logo = radius * ini
  glowScale: 3.4, // lebar cahaya = radius * ini
} as const;

export const PARTICLES = {
  count: { desktop: 8000, mobile: 4200 },
  seed: 20261027,
  size: 1.1,
  bigSize: 1.7,
  rotationSpeed: 0.07, // rad/detik
  tilt: 0.32,
  /** Seberapa besar bola membesar saat pecah. */
  zoom: 2.4,
  /** Jangkauan tolak kursor dan kekuatannya (px). */
  repelRadius: 70,
  repelPush: 26,
  /** Bagian titik yang tersisa sebagai bintang. */
  starRatio: 0.32,
} as const;

/** Arah cahaya (sudah dinormalisasi): dari kiri-atas, condong ke penonton. */
export const LIGHT = { x: -0.291, y: 0.825, z: 0.485 } as const;

export const BRIGHTNESS = {
  base: 0.14,
  lambert: 0.62,
  rim: 0.28,
  /** Pengali untuk sisi belakang bola. */
  back: 0.55,
  starMin: 0.25,
  starRange: 0.55,
} as const;

export const PALETTE = {
  binCount: 10,
  low: [139, 92, 246],
  high: [245, 243, 255],
  lowAlpha: 0.25,
} as const;