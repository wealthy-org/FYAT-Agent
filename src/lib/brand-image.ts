import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/** Logo sebagai data URI, untuk dirender di gambar OG dan favicon. */
export async function readLogoDataUri(): Promise<string> {
  const file = await readFile(
    path.join(process.cwd(), "public", "brand", "logo.jpeg"),
  );
  return `data:image/jpeg;base64,${file.toString("base64")}`;
}