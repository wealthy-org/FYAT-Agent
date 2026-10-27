const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** "2026-10-27T10:05:00.000Z" → "Oct 27, 2026, 10:05 AM UTC" */
export function formatUtcDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} UTC`;
}