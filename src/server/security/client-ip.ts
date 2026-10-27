import "server-only";

import type { NextRequest } from "next/server";

const UNKNOWN = "unknown";
/** Hanya karakter IPv4/IPv6. Mencegah header sampah menjadi kunci bucket. */
const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;

/**
 * Best-effort. Header ini hanya bisa dipercaya bila aplikasi berada di balik
 * proxy yang menimpanya (Vercel melakukannya). Tanpa proxy, klien bisa memalsukannya.
 */
export function getClientIp(req: NextRequest): string {
  const candidate =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    UNKNOWN;

  const ip = candidate.trim();
  return IP_PATTERN.test(ip) ? ip : UNKNOWN;
}