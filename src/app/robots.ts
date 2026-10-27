import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // API bukan konten untuk diindeks.
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${getSiteUrl().origin}/sitemap.xml`,
  };
}