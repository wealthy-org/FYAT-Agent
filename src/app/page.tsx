import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {siteConfig.name}
        </h1>
        <p className="mt-3 text-fg-muted">{siteConfig.tagline}</p>
      </div>
    </main>
  );
}