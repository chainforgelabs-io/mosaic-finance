import { afterEach, describe, expect, it, vi } from "vitest";
import { clearApiCache, getJson, invalidateApi, peekJson, watchJson } from "@/lib/client/api-cache";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  clearApiCache();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("api cache", () => {
  it("shares one request between concurrent callers", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return jsonResponse({ planSet: true });
      }),
    );

    const [first, second] = await Promise.all([
      getJson("/api/setup/status"),
      getJson("/api/setup/status"),
    ]);

    expect(calls).toBe(1);
    expect(first.body).toEqual({ planSet: true });
    expect(second.body).toEqual({ planSet: true });
  });

  it("returns a fresh body without another request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ weeklyStreak: 2 }));
    vi.stubGlobal("fetch", fetchMock);

    await getJson("/api/gamification/summary");
    const again = await getJson("/api/gamification/summary");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(again.body).toEqual({ weeklyStreak: 2 });
    expect(peekJson("/api/gamification/summary")).toEqual({ weeklyStreak: 2 });
  });

  it("shows the cached body, then the refreshed one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    const fetchMock = vi.fn(async () => jsonResponse({ n: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await getJson("/api/goals");

    vi.setSystemTime(new Date("2026-11-25T12:00:03Z"));
    fetchMock.mockImplementation(async () => jsonResponse({ n: 2 }));
    const seen: unknown[] = [];
    const pending = watchJson("/api/goals", (body) => seen.push(body));
    await vi.runAllTicks();
    expect(seen).toEqual([{ n: 1 }]);
    await pending;
    expect(seen).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it("drops a prefix on save and everything on sign-out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => jsonResponse({ url })),
    );
    await getJson("/api/transactions?start=2026-11-01&end=2026-11-25");
    await getJson("/api/goals");
    invalidateApi("/api/transactions");
    expect(peekJson("/api/transactions?start=2026-11-01&end=2026-11-25")).toBeNull();
    expect(peekJson("/api/goals")).toEqual({ url: "/api/goals" });

    clearApiCache();
    expect(peekJson("/api/goals")).toBeNull();
  });
});
