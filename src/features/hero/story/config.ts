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
  copy1In: [0.30, 0.38],
  copy1Out: [0.48, 0.58],
  nodesDim: [0.52, 0.70],
  copy2In: [0.57, 0.65],
  strip: [0.68, 0.82],
  stripActiveAt: 0.76,

  nodeStagger: 0.08,
  nodeParallax: 0.9,
  nodeDim: 0.85,
} as const;

export const SPHERE = {
  radiusRatio: 0.28,
  minRadius: 190,
  maxRadius: 800,
  centerY: 0.62,
  logoScale: 0.80,
  glowScale: 3.8,
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
  repelRadius: 120,
  repelPush: 26,
  /** Bagian titik yang tersisa sebagai bintang. */
  starRatio: 0.32,
} as const;

/** Animasi masuk: partikel mencar lalu berkumpul jadi bola. */
export const INTRO = {
  /** Jeda sebelum partikel mulai berkumpul (detik). */
  delay: 0.2,
  /** Lama partikel berkumpul (detik). */
  duration: 2.4,
  /** Seberapa jauh partikel mencar di awal (dikali lebar/tinggi layar). */
  spread: 0.9,
  /** Putaran spiral saat berkumpul (radian). 0 = lurus ke pusat. */
  swirl: 1.4,
  /** Selisih waktu tiba antar partikel (0..1). Makin besar = makin bergelombang. */
  stagger: 0.45,
  /** Rentang progres intro tempat logo, glow, dan teks muncul. */
  reveal: [0.5, 1],
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