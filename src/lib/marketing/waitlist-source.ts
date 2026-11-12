/** Join a fixed form name with a sanitized utm_source, capped for the waitlist column. */
export function waitlistSource(fallback: string, utmSource: string | null | undefined): string {
  const base = fallback.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "waitlist";
  const utm = (utmSource ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  if (!utm) return base.slice(0, 64);
  return `${base}-${utm}`.slice(0, 64);
}
