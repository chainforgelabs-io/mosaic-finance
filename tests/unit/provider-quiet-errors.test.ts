import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { GrokConfigError } from "@/lib/grok/errors";
import { captureAPIError } from "@/lib/sentry";
import { SENTRY_IGNORE_ERRORS } from "@/lib/sentry-ignore";

describe("provider errors that should not open Sentry issues", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not capture a disabled Grok key", () => {
    captureAPIError(new GrokConfigError(403), { route: "market/social" });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("still captures an unexpected Grok failure", () => {
    captureAPIError(new Error("Grok API error 500: boom"), { route: "market/social" });
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("ignores stale Server Action ids from an old deployment", () => {
    expect(SENTRY_IGNORE_ERRORS).toContain("Failed to find Server Action");
  });

  it("returns no historical prices when FMP responds 402", async () => {
    process.env.FMP_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("payment required", { status: 402 })),
    );
    const { getHistoricalPrices } = await import("@/lib/market-data/fmp");
    await expect(getHistoricalPrices("AAPL", "2026-08-01", "2026-08-31")).resolves.toEqual(
      [],
    );
  });

  it("throws GrokConfigError on 403 without the response body", async () => {
    process.env.XAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "API key is disabled sk-secret" }), {
          status: 403,
        }),
      ),
    );
    const { grokChat } = await import("@/lib/grok/client");
    const error = await grokChat([{ role: "user", content: "hi" }]).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(GrokConfigError);
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).not.toContain("sk-secret");
    }
  });
});
