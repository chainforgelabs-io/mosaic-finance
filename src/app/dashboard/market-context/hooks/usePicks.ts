"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DiscoverFilter,
  EnrichedPick,
  RawSignal,
  ScanSummary,
  TickerPersonaTake,
  TickerSignal,
  TrackedCongressMember,
  TrackedXAccount,
  XOAuthConnection,
} from "@/types/picks";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function usePicksSignals(filter: DiscoverFilter) {
  const [signals, setSignals] = useState<TickerSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await getJson<{ signals: TickerSignal[] }>(
        `/api/picks/signals?filter=${filter}&limit=50`,
      );
      setSignals(body.signals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { signals, loading, error, refetch };
}

export function useTickerDetail(ticker: string | null) {
  const [detail, setDetail] = useState<{
    signal: TickerSignal | null;
    recentSignals: RawSignal[];
    takes: TickerPersonaTake[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!ticker) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const body = await getJson<{
        signal: TickerSignal | null;
        recentSignals: RawSignal[];
        takes: TickerPersonaTake[];
      }>(`/api/picks/signals/${encodeURIComponent(ticker)}`);
      setDetail(body);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { detail, loading, refetch };
}

export function useMyPicks() {
  const [picks, setPicks] = useState<EnrichedPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await getJson<{ picks: EnrichedPick[] }>("/api/picks/my");
      setPicks(body.picks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load picks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const addPick = useCallback(
    async (ticker: string) => {
      const res = await fetch("/api/picks/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (res.ok || res.status === 409) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const removePick = useCallback(
    async (ticker: string) => {
      const res = await fetch(
        `/api/picks/my?ticker=${encodeURIComponent(ticker)}`,
        { method: "DELETE" },
      );
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  return { picks, loading, error, refetch, addPick, removePick };
}

export function useSources() {
  const [xAccounts, setXAccounts] = useState<TrackedXAccount[]>([]);
  const [congressMembers, setCongressMembers] = useState<
    TrackedCongressMember[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await getJson<{
        xAccounts: TrackedXAccount[];
        congressMembers: TrackedCongressMember[];
      }>("/api/picks/sources");
      setXAccounts(body.xAccounts);
      setCongressMembers(body.congressMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { xAccounts, congressMembers, loading, error, refetch };
}

export function useXConnection() {
  const [configured, setConfigured] = useState(false);
  const [connection, setConnection] = useState<XOAuthConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const body = await getJson<{
        configured: boolean;
        connection: XOAuthConnection | null;
      }>("/api/picks/twitter");
      setConfigured(body.configured);
      setConnection(body.connection);
    } catch {
      setConfigured(false);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { configured, connection, loading, refetch };
}

export function useScan() {
  const [scanning, setScanning] = useState(false);
  const [lastSummary, setLastSummary] = useState<ScanSummary | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const runScan = useCallback(async (includeFirehose?: boolean) => {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/picks/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          includeFirehose === undefined ? {} : { includeFirehose },
        ),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Scan failed");
      }
      setLastSummary(body.summary as ScanSummary);
      return true;
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
      return false;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanning, lastSummary, scanError, runScan };
}
