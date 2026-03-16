"use client";

import { useEffect, useRef } from "react";
import { useMarketStore } from "@/stores/market-store";

const DEBOUNCE_MS = 300;

export function useStockSearch() {
  const {
    searchQuery,
    setSearchQuery,
    setSearchResults,
    setSearchLoading,
  } = useMarketStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/market/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchQuery, setSearchResults, setSearchLoading]);

  return { searchQuery, setSearchQuery };
}

export function useCompanyData(symbol: string | null) {
  const {
    setCompanyProfile,
    setCompanyProfileLoading,
    setHistoricalPrices,
    setHistoricalLoading,
  } = useMarketStore();

  useEffect(() => {
    if (!symbol) {
      setCompanyProfile(null);
      setHistoricalPrices([]);
      return;
    }

    let cancelled = false;

    async function loadCompany() {
      setCompanyProfileLoading(true);
      try {
        const res = await fetch(`/api/market/company/${encodeURIComponent(symbol!)}`);
        if (!res.ok) throw new Error("Failed to load company");
        const data = await res.json();
        if (!cancelled) {
          setCompanyProfile(data.profile);
        }
      } catch {
        if (!cancelled) setCompanyProfile(null);
      } finally {
        if (!cancelled) setCompanyProfileLoading(false);
      }
    }

    async function loadHistorical() {
      setHistoricalLoading(true);
      try {
        const res = await fetch(
          `/api/market/historical?symbol=${encodeURIComponent(symbol!)}&timeframe=1M`,
        );
        if (!res.ok) throw new Error("Failed to load historical");
        const data = await res.json();
        if (!cancelled) setHistoricalPrices(data.prices || []);
      } catch {
        if (!cancelled) setHistoricalPrices([]);
      } finally {
        if (!cancelled) setHistoricalLoading(false);
      }
    }

    loadCompany();
    loadHistorical();

    return () => { cancelled = true; };
  }, [
    symbol,
    setCompanyProfile,
    setCompanyProfileLoading,
    setHistoricalPrices,
    setHistoricalLoading,
  ]);

  function loadTimeframe(timeframe: string) {
    if (!symbol) return;

    setHistoricalLoading(true);
    fetch(
      `/api/market/historical?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`,
    )
      .then((res) => res.json())
      .then((data) => setHistoricalPrices(data.prices || []))
      .catch(() => setHistoricalPrices([]))
      .finally(() => setHistoricalLoading(false));
  }

  return { loadTimeframe };
}
