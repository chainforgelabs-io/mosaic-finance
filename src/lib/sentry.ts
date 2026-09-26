import * as Sentry from "@sentry/nextjs";
import { GrokConfigError } from "@/lib/grok/errors";

export function isQuietError(error: unknown): boolean {
  return error instanceof GrokConfigError;
}

export function captureAPIError(
  error: unknown,
  context: Record<string, unknown>
) {
  if (isQuietError(error)) return;
  Sentry.captureException(error, { extra: context });
}

export function trackSLABreach(planId: string, queueId: string, slaDeadline: string) {
  Sentry.captureMessage("Approval queue SLA breach", {
    level: "warning",
    extra: { planId, queueId, slaDeadline, breachedAt: new Date().toISOString() },
  });
}
