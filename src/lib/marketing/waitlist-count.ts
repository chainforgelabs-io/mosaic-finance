/** Show the public tally only after the list is past this size. */
export const WAITLIST_COUNT_PUBLIC_AFTER = 100;

export function publicWaitlistCount(count: number | null | undefined): number | null {
  if (count == null || !Number.isFinite(count) || count <= WAITLIST_COUNT_PUBLIC_AFTER) return null;
  return count;
}
