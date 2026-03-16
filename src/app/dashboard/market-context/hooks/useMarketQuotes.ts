"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMarketStore } from "@/stores/market-store";

const POLL_INTERVAL = 30_000;

export function useMarketQuotes(symbols?: string) {
  const {
    setIndexQuotes,
    setIndexQuotesLoading,
    setIndexQuotesError,
  } = useMarketStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const url = symbols
        ? `/api/market/quotes?symbols=${encodeURIComponent(symbols)}`
        : "/api/market/quotes";

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch quotes");

      const data = await res.json();
      setIndexQuotes(data.quotes || []);
    } catch (err) {
      setIndexQuotesError(
        err instanceof Error ? err.message : "Failed to load quotes",
      );
    }
  }, [symbols, setIndexQuotes, setIndexQuotesError]);

  useEffect(() => {
    setIndexQuotesLoading(true);
    fetchQuotes().finally(() => setIndexQuotesLoading(false));

    intervalRef.current = setInterval(fetchQuotes, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuotes, setIndexQuotesLoading]);

  return { refetch: fetchQuotes };
}

export function useMarketMovers() {
  const { setMovers, setMoversLoading } = useMarketStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMoversLoading(true);
      try {
        const res = await fetch("/api/market/movers");
        if (!res.ok) throw new Error("Failed to fetch movers");
        const data = await res.json();
        if (!cancelled) setMovers(data);
      } catch {
        // Movers are non-critical
      } finally {
        if (!cancelled) setMoversLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [setMovers, setMoversLoading]);
}

export function useSectors() {
  const { setSectors, setSectorsLoading } = useMarketStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setSectorsLoading(true);
      try {
        const res = await fetch("/api/market/sectors");
        if (!res.ok) throw new Error("Failed to fetch sectors");
        const data = await res.json();
        if (!cancelled) setSectors(data.sectors || []);
      } catch {
        // Sectors are non-critical
      } finally {
        if (!cancelled) setSectorsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [setSectors, setSectorsLoading]);
}

export function useWatchlist() {
  const { watchlist, setWatchlist } = useMarketStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market/watchlist");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setWatchlist(data.watchlist || []);
      } catch {
        // Non-critical
      }
    }

    load();
    return () => { cancelled = true; };
  }, [setWatchlist]);

  const addToWatchlist = async (symbol: string) => {
    try {
      const res = await fetch("/api/market/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setWatchlist([data.item, ...watchlist]);
    } catch {
      // Silently fail
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const res = await fetch(
        `/api/market/watchlist?symbol=${encodeURIComponent(symbol)}`,
        { method: "DELETE" },
      );
      if (!res.ok) return;
      setWatchlist(watchlist.filter((w) => w.symbol !== symbol));
    } catch {
      // Silently fail
    }
  };

  return { watchlist, addToWatchlist, removeFromWatchlist };
}
