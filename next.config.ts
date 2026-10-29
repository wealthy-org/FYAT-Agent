import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const FALLBACK_RPC = "https://api.devnet.solana.com";

/** Hanya origin (tanpa path dan ?api-key=) yang boleh masuk ke CSP. */
function rpcOrigins(raw: string | undefined): string[] {
  try {
    const { origin } = new URL(raw || FALLBACK_RPC);
    return [origin, origin.replace(/^http/, "ws")];
  } catch {
    return [FALLBACK_RPC, FALLBACK_RPC.replace(/^http/, "ws")];
  }
}

const connectSrc = [
  "'self'",
  // Fallback publik tetap diizinkan agar perpindahan RPC tidak memutus wallet.
  ...new Set([
    ...rpcOrigins(FALLBACK_RPC),
    ...rpcOrigins(process.env.NEXT_PUBLIC_SOLANA_RPC_URL),
  ]),
].join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src ${connectSrc}`,
  "frame-src https://connect.solflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@meteora-ag/cp-amm-sdk"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;