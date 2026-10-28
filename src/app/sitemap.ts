import type { MetadataRoute } from "next";

import { allDocs, isLiveDoc } from "@/features/docs/data";
import { docsPages } from "@/features/docs/pages";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl().origin;

  // Halaman docs yang masih "coming soon" tidak dimasukkan.
  const docs = allDocs
    .filter((doc) => doc.slug in docsPages || isLiveDoc(doc.slug))
    .map((doc) => ({
      url: `${origin}/docs/${doc.slug}`,
      changeFrequency: isLiveDoc(doc.slug) ? ("weekly" as const) : ("monthly" as const),
      priority: isLiveDoc(doc.slug) ? 0.9 : 0.6,
    }));

  return [{ url: origin, changeFrequency: "weekly", priority: 1 }, ...docs];
}