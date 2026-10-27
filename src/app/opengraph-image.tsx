import { ImageResponse } from "next/og";

import { readLogoDataUri } from "@/lib/brand-image";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 64,
          width: "100%",
          height: "100%",
          padding: 80,
          background: "linear-gradient(135deg, #0a0a0c 0%, #1a0f3a 100%)",
          color: "#f4f4f5",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 260,
            height: 260,
            flexShrink: 0,
            overflow: "hidden",
            borderRadius: 56,
            background: "#000",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt=""
            width={525}
            height={525}
            style={{ position: "absolute", left: -159, top: -135 }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2 }}>
            {siteConfig.name}
          </div>
          <div style={{ marginTop: 20, fontSize: 36, color: "#c4b5fd" }}>
            {siteConfig.tagline}
          </div>
        </div>
      </div>
    ),
    size,
  );
}