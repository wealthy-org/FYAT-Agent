import { ImageResponse } from "next/og";

import { readLogoDataUri } from "@/lib/brand-image";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 14,
          background: "#000",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          width={129}
          height={129}
          style={{ position: "absolute", left: -39, top: -33 }}
        />
      </div>
    ),
    size,
  );
}