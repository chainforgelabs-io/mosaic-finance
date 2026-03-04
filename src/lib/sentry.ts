import * as Sentry from "@sentry/nextjs";

export function captureAPIError(
  error: unknown,
  context: Record<string, unknown>
) {
  Sentry.captureException(error, { extra: context });
}

export function trackSLABreach(planId: string, queueId: string, slaDeadline: string) {
  Sentry.captureMessage("Approval queue SLA breach", {
    level: "warning",
    extra: { planId, queueId, slaDeadline, breachedAt: new Date().toISOString() },
  });
}
