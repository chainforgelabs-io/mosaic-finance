"use client";

import { useEffect, useCallback } from "react";
import { useMarketStore } from "@/stores/market-store";

export function useNews(category?: string) {
  const {
    setNewsArticles,
    setNewsLoading,
    setNewsError,
  } = useMarketStore();

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);

    try {
      const params = category ? `?category=${encodeURIComponent(category)}` : "";
      const res = await fetch(`/api/market/news${params}`);
      if (!res.ok) throw new Error("Failed to load news");
      const data = await res.json();
      setNewsArticles(data.articles || []);
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setNewsLoading(false);
    }
  }, [category, setNewsArticles, setNewsLoading, setNewsError]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return { refetch: fetchNews };
}

export function useSocialSentiment(ticker?: string) {
  const {
    setSocialSentiment,
    setSocialLoading,
  } = useMarketStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setSocialLoading(true);
      try {
        const params = ticker ? `?ticker=${encodeURIComponent(ticker)}` : "";
        const res = await fetch(`/api/market/social${params}`);
        if (!res.ok) throw new Error("Failed to load social data");
        const data = await res.json();
        if (!cancelled) setSocialSentiment(data.sentiment);
      } catch {
        if (!cancelled) setSocialSentiment(null);
      } finally {
        if (!cancelled) setSocialLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [ticker, setSocialSentiment, setSocialLoading]);
}
