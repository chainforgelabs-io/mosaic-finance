import * as Sentry from "@sentry/nextjs";

const production = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: production ? 0.1 : 1,
  replaysSessionSampleRate: production ? 0 : 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.replayIntegration(),
  ],
  debug: false,
});
