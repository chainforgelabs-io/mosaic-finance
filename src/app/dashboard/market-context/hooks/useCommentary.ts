"use client";

import { useEffect, useCallback, useState } from "react";
import { useMarketStore } from "@/stores/market-store";
import type { PersonaSlug } from "@/lib/market-data/types";

export function useCommentary() {
  const {
    setCommentaries,
    setCommentariesLoading,
  } = useMarketStore();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCommentariesLoading(true);
      try {
        const res = await fetch("/api/market/commentary");
        if (!res.ok) throw new Error("Failed to load commentary");
        const data = await res.json();
        if (!cancelled) setCommentaries(data.commentaries || []);
      } catch {
        if (!cancelled) setCommentaries([]);
      } finally {
        if (!cancelled) setCommentariesLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [setCommentaries, setCommentariesLoading]);
}

export function useGenerateCommentary() {
  const { commentaries, setCommentaries } = useMarketStore();
  const [generating, setGenerating] = useState<PersonaSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (persona: PersonaSlug) => {
      setGenerating(persona);
      setError(null);

      try {
        const res = await fetch("/api/market/commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Generation failed");
        }

        const data = await res.json();
        const existing = commentaries.filter((c) => c.persona !== persona);
        setCommentaries([data.commentary, ...existing]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setGenerating(null);
      }
    },
    [commentaries, setCommentaries],
  );

  return { generate, generating, error };
}
