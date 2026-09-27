import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const chromiumPack = "./node_modules/@sparticuz/chromium/**/*";
const heicPack = [
  "./node_modules/heic-convert/**/*",
  "./node_modules/heic-decode/**/*",
  "./node_modules/libheif-js/**/*",
  "./node_modules/jpeg-js/**/*",
  "./node_modules/pngjs/**/*",
];

const nextConfig: NextConfig = {
  // Keep Puppeteer and Chromium out of the bundle so launch() can resolve the browser binary.
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
    "heic-convert",
    "heic-decode",
  ],
  // The brotli pack is loaded from disk, so the tracer never sees it.
  outputFileTracingIncludes: {
    "/api/plan/generate": [chromiumPack],
    "/api/plan/regenerate": [chromiumPack],
    "/api/plan/[planId]/pdf": [chromiumPack],
    "/api/plan/[planId]/draft-pdf": [chromiumPack],
    "/api/approval/[reportId]": [chromiumPack],
    "/api/conversation/session/[sessionId]/apply-changes": [chromiumPack],
    "/api/upload/spending": heicPack,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
