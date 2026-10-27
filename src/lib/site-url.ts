const FALLBACK_URL = "http://localhost:3000";

export function getSiteUrl(): URL {
  const raw = process.env.APP_URL;
  return new URL(raw && URL.canParse(raw) ? raw : FALLBACK_URL);
}