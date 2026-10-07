import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison that also rejects when either side is empty. */
export function bearerMatches(header: string | null, secret: string | undefined | null): boolean {
  if (!header || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/**
 * True only when CRON_SECRET is configured and the Authorization header
 * matches it exactly. With the env var unset, `Bearer undefined` used to pass
 * the old string comparison and could trigger mass email sends.
 */
export function isCronRequest(request: { headers: { get(name: string): string | null } }): boolean {
  return bearerMatches(request.headers.get("authorization"), process.env.CRON_SECRET);
}
