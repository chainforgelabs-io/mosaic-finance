"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PlanStatus =
  | "generating"
  | "pending_review"
  | "delivered"
  | "rejected";

interface PlanStatusState {
  status: PlanStatus | null;
  error: string | null;
}

export function usePlanStatusSubscription(planId: string | null): PlanStatusState {
  const [state, setState] = useState<PlanStatusState>({
    status: null,
    error: null,
  });
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!planId) return;

    const supabase = createClient();

    async function fetchInitialStatus() {
      const { data, error } = await supabase
        .from("financial_plans")
        .select("status")
        .eq("id", planId)
        .single();

      if (error) {
        setState({ status: null, error: "Failed to load plan status." });
        return;
      }

      setState({ status: data.status as PlanStatus, error: null });
    }

    fetchInitialStatus();

    const channel = supabase
      .channel(`plan-status-${planId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "financial_plans",
          filter: `id=eq.${planId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as PlanStatus;
          setState({ status: newStatus, error: null });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setState((prev) => ({
            ...prev,
            error: "Lost connection. Refreshing status...",
          }));
          fetchInitialStatus();
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [planId]);

  return state;
}
