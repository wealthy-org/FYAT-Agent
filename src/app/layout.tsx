import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SolanaProvider } from "@/features/wallet";
import { fontDisplay, fontMono, fontSans } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontVars = [fontSans, fontDisplay, fontMono]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang="en" className={fontVars}>
      <body>
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}