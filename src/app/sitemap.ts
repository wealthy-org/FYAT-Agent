import type { MetadataRoute } from "next";

import { allDocs } from "@/features/docs/data";
import { docsPages } from "@/features/docs/pages";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl().origin;

  // Halaman docs yang masih "coming soon" tidak dimasukkan.
  const docs = allDocs
    .filter((doc) => doc.slug in docsPages)
    .map((doc) => ({
      url: `${origin}/docs/${doc.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/builder`, changeFrequency: "weekly", priority: 0.9 },
    ...docs,
  ];
}