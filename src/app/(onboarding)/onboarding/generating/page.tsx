"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinovaLogo } from "@/components/app/FinovaLogo";
import { StepProgress } from "@/components/app/StepProgress";
import { TierBadge } from "@/components/app/TierBadge";
import { useOnboardingStore } from "@/stores/onboarding";
import {
  usePlanStatusSubscription,
  type PlanStatus,
} from "@/hooks/usePlanStatusSubscription";

const GENERATION_STEPS = [
  "Analyzing your financial profile",
  "Building retirement projections",
  "Analyzing investment considerations",
  "Running tax efficiency analysis",
  "Finalizing plan...",
] as const;

const STEP_INTERVAL_MS = 1500;

function GeneratingState({
  visibleSteps,
}: {
  visibleSteps: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="mb-10 rounded-2xl"
        style={{ animation: "emerald-glow 2.5s ease-in-out infinite" }}
      >
        <FinovaLogo size="lg" />
      </div>

      <h1 className="mb-8 text-center font-display text-[26px] font-semibold text-[var(--text-primary)]">
        Building your financial plan
      </h1>

      <div className="mb-8 w-full max-w-sm space-y-3">
        {GENERATION_STEPS.map((step, index) => {
          const isVisible = index < visibleSteps;
          const isComplete = index < visibleSteps - 1;
          const isCurrent = index === visibleSteps - 1;
          const isLast = index === GENERATION_STEPS.length - 1;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 transition-all",
                isVisible
                  ? "opacity-100"
                  : "pointer-events-none h-0 overflow-hidden opacity-0",
              )}
              style={
                isVisible
                  ? { animation: "checklist-enter 400ms ease-out both" }
                  : undefined
              }
            >
              {isComplete ? (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)]">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
              ) : isCurrent && isLast ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-[var(--emerald)]" />
              ) : isCurrent ? (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--emerald)]">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="size-5 shrink-0 rounded-full border-2 border-[var(--warm-200)]" />
              )}
              <span
                className={cn(
                  "font-body text-[15px]",
                  isComplete || (isCurrent && !isLast)
                    ? "text-[var(--text-primary)]"
                    : isCurrent && isLast
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]",
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <p className="font-body text-[14px] text-[var(--text-muted)]">
        This usually takes a few minutes
      </p>
    </div>
  );
}

function PendingReviewState({ tier }: { tier: "free" | "essential" | "pro" | "premium" }) {
  const [faqOpen, setFaqOpen] = useState(false);
  const router = useRouter();

  const estimatedDelivery = tier === "premium" ? "8 hours" : "24 hours";

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-[var(--emerald)]/10">
        <Clock className="size-8 text-[var(--emerald)]" />
      </div>

      <h1 className="mb-3 text-center font-display text-[28px] font-bold text-[var(--text-primary)]">
        Your plan is in review
      </h1>

      <p className="mb-6 max-w-md text-center font-body text-[16px] leading-relaxed text-[var(--text-secondary)]">
        A CIM-designated professional is reviewing your plan.
        You&apos;ll receive an email when it&apos;s ready.
      </p>

      <p className="mb-2 text-center font-display text-[20px] font-semibold text-[var(--text-primary)]">
        Ready within {estimatedDelivery}
      </p>

      <div className="mb-8">
        <TierBadge tier={tier} />
      </div>

      <div className="mb-8 w-full max-w-md">
        <button
          type="button"
          onClick={() => setFaqOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--warm-200)] bg-white px-5 py-4 transition-colors hover:bg-[var(--warm-100)]"
        >
          <span className="font-display text-[15px] font-medium text-[var(--text-primary)]">
            What happens during review?
          </span>
          <ChevronDown
            className={cn(
              "size-5 text-[var(--text-muted)] transition-transform duration-200",
              faqOpen && "rotate-180",
            )}
          />
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-out",
            faqOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="rounded-b-lg border border-t-0 border-[var(--warm-200)] bg-white px-5 py-4">
            <ul className="space-y-2.5 font-body text-[14px] leading-relaxed text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--emerald)]" />
                A CIM-designated professional reviews every plan for
                suitability and accuracy.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--emerald)]" />
                They verify that tax optimization strategies are appropriate for
                your province and situation.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--emerald)]" />
                The reviewer may adjust ETF selections or allocation
                percentages before final delivery.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--emerald)]" />
                You&apos;ll be notified by email and in-app as soon as your plan
                is ready.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="rounded-lg border border-[var(--slate-950)] bg-white px-8 py-3 font-display text-[15px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--warm-100)]"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default function GeneratingPage() {
  const router = useRouter();
  const { currentStep, completedSteps, setCurrentStep, completeStep } =
    useOnboardingStore();

  const [planId, setPlanId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<"generating" | "pending_review">(
    "generating",
  );
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [tier, setTier] = useState<"free" | "essential" | "pro" | "premium">(
    "free",
  );
  const [error, setError] = useState<string | null>(null);
  const hasTriggered = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const POLL_INTERVAL_MS = 5_000;
  const POLL_TIMEOUT_MS = 10 * 60 * 1000;

  const { status: realtimeStatus } = usePlanStatusSubscription(planId);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollForPlan = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/plan/latest", { credentials: "include" });

      if (res.status === 401) {
        stopPolling();
        router.push("/login?redirectTo=/onboarding/generating");
        return true;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          stopPolling();
          setPlanId(data.plan.id);
          if (data.plan.status === "pending_review" || data.plan.status === "delivered") {
            setPageState("pending_review");
            completeStep("generating");
          }
          return true;
        }
      }
    } catch {
      // Network blip — keep polling
    }

    if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
      stopPolling();
      setError("Plan generation is taking longer than expected. Please try again.");
      hasTriggered.current = false;
      return true;
    }

    return false;
  }, [completeStep, router, stopPolling]);

  useEffect(() => {
    completeStep("profile");
    completeStep("fact-find");
    completeStep("risk-profile");
    completeStep("holdings");
    setCurrentStep("generating");
  }, [completeStep, setCurrentStep]);

  const triggerGeneration = useCallback(async () => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    try {
      const latestRes = await fetch("/api/plan/latest", {
        credentials: "include",
      });

      if (latestRes.status === 401) {
        router.push("/login?redirectTo=/onboarding/generating");
        return;
      }

      if (latestRes.ok) {
        const latestData = await latestRes.json();
        if (latestData.plan) {
          setPlanId(latestData.plan.id);
          if (latestData.plan.status === "pending_review" || latestData.plan.status === "delivered") {
            setPageState("pending_review");
            completeStep("generating");
          }
          return;
        }
      }

      const res = await fetch("/api/plan/generate", {
        method: "POST",
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login?redirectTo=/onboarding/generating");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.planId) {
          setPlanId(data.planId);
          if (data.status === "pending_review" || data.status === "delivered") {
            setPageState("pending_review");
            completeStep("generating");
            return;
          }
        }
      } else if (res.status !== 202) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to start plan generation.");
        hasTriggered.current = false;
        return;
      }

      pollStartRef.current = Date.now();
      pollRef.current = setInterval(() => { pollForPlan(); }, POLL_INTERVAL_MS);
    } catch {
      setError("Network error. Please try again.");
      hasTriggered.current = false;
    }
  }, [completeStep, router, pollForPlan]);

  useEffect(() => {
    triggerGeneration();
    return () => stopPolling();
  }, [triggerGeneration, stopPolling]);

  useEffect(() => {
    if (pageState !== "generating") return;

    if (visibleSteps >= GENERATION_STEPS.length) return;

    const timer = setTimeout(() => {
      setVisibleSteps((prev) => Math.min(prev + 1, GENERATION_STEPS.length));
    }, STEP_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [visibleSteps, pageState]);

  useEffect(() => {
    if (!realtimeStatus) return;

    if (realtimeStatus === "delivered") {
      completeStep("generating");
      completeStep("review");
      router.push("/dashboard");
      return;
    }

    if (
      realtimeStatus === "pending_review" &&
      pageState === "generating"
    ) {
      setPageState("pending_review");
      completeStep("generating");
    }
  }, [realtimeStatus, pageState, completeStep, router]);

  useEffect(() => {
    async function fetchTier() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("user_profiles")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();

          if (data?.subscription_tier) {
            setTier(data.subscription_tier as typeof tier);
          }
        }
      } catch {
        // Fall back to "free"
      }
    }

    fetchTier();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="shrink-0 px-4">
        <div className="mx-auto max-w-[920px]">
          <div className="flex justify-center">
            <FinovaLogo size="sm" />
          </div>
          <StepProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {error ? (
            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 px-6 py-4">
                <p className="font-body text-[14px] text-[var(--error)]">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  hasTriggered.current = false;
                  triggerGeneration();
                }}
                className="rounded-lg bg-[var(--emerald)] px-6 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
              >
                Try Again
              </button>
            </div>
          ) : pageState === "generating" ? (
            <GeneratingState visibleSteps={visibleSteps} />
          ) : (
            <PendingReviewState tier={tier} />
          )}
        </div>
      </div>
    </div>
  );
}
