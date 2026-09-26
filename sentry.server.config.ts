import * as Sentry from "@sentry/nextjs";
import { SENTRY_IGNORE_ERRORS } from "./src/lib/sentry-ignore";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  ignoreErrors: SENTRY_IGNORE_ERRORS,
});
