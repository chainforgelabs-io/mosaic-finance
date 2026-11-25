"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TOUR_OPEN_EVENT } from "@/components/app/ReplayTourLink";
import { TourExample } from "@/components/tour/TourExample";
import {
  TOUR_STEPS,
  chapterLabel,
  readTourStep,
  rememberTourStep,
} from "@/lib/onboarding/tour";
import { cn } from "@/lib/utils";

const OUTLINE = 10;

export function AppTour({ userId }: { userId?: string }) {
  return (
    <Suspense fallback={null}>
      <TourOverlay userId={userId} />
    </Suspense>
  );
}

function TourOverlay({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [place, setPlace] = useState<{ top: number; pin: "left" | "right" | "full" }>({ top: 8, pin: "full" });
  const cardRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setTimeout(() => {
      const live = new URLSearchParams(window.location.search);
      const welcome = live.get("welcome") === "1" || params.get("welcome") === "1";
      const replay = live.get("tour") === "1" || params.get("tour") === "1";
      if (welcome) {
        rememberTourStep(userId, 0);
        setStep(0);
      } else if (replay) {
        const stored = readTourStep(userId);
        setStep(typeof stored === "number" ? stored : 0);
      } else {
        const stored = readTourStep(userId);
        setStep(typeof stored === "number" ? stored : null);
      }
      if ((live.get("welcome") === "1" || live.get("tour") === "1") && window.location.search) {
        const url = new URL(window.location.href);
        url.searchParams.delete("welcome");
        url.searchParams.delete("tour");
        const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
        window.history.replaceState({}, "", next);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userId, pathname, params]);

  useEffect(() => {
    if (!userId) return;
    function onOpen() {
      const stored = readTourStep(userId!);
      setStep(typeof stored === "number" ? stored : 0);
    }
    window.addEventListener(TOUR_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, onOpen);
  }, [userId]);

  useEffect(() => {
    if (step == null) return;
    const current = TOUR_STEPS[step];
    let stopped = false;
    let attempts = 0;
    let timer = 0;

    function findTarget(): HTMLElement | null {
      if (pathname !== current.path) return null;
      for (const id of current.targets) {
        const node = document.querySelector(`[data-tour="${id}"]`);
        if (!(node instanceof HTMLElement)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return node;
      }
      return null;
    }

    function layout(rect: DOMRect | null) {
      const height = cardRef.current?.offsetHeight ?? 240;
      if (!rect) {
        setPlace({ top: 8, pin: "full" });
        return;
      }
      const gap = 16;
      const below = rect.bottom + OUTLINE + gap;
      const above = rect.top - OUTLINE - gap - height;
      const tab = window.innerWidth < 640 ? 88 : 16;
      const top = below + height < window.innerHeight - tab ? below : above > 8 ? above : 8;
      const center = rect.left + rect.width / 2;
      const pin = window.innerWidth >= 640 ? (center > window.innerWidth / 2 ? "left" : "right") : "full";
      setPlace({ top, pin });
    }

    function placeCard() {
      if (stopped) return;
      const el = findTarget();
      if (!el) {
        setBox(null);
        layout(null);
        if (pathname === current.path && attempts < 20) {
          attempts += 1;
          timer = window.setTimeout(placeCard, 100);
        }
        return;
      }
      const rect = el.getBoundingClientRect();
      const marginBottom = Math.min(260, window.innerHeight * 0.35);
      const outOfView = rect.top < 80 || rect.bottom > window.innerHeight - marginBottom;
      if (outOfView && scrolledFor.current !== current.id) {
        scrolledFor.current = current.id;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      setBox(rect);
      layout(rect);
    }

    function follow() {
      const el = findTarget();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBox(rect);
      layout(rect);
    }

    placeCard();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    const observer = new ResizeObserver(follow);
    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
      observer.disconnect();
    };
  }, [step, pathname]);

  const current = step != null ? TOUR_STEPS[step] : null;
  if (!userId || step == null || !current) return null;
  const onPage = pathname === current.path;

  function go(next: number | "done") {
    if (!userId) return;
    if (next === "done") {
      rememberTourStep(userId, "done");
      setStep(null);
      return;
    }
    rememberTourStep(userId, next);
    setStep(next);
    const path = TOUR_STEPS[next].path;
    if (pathname !== path) router.push(path);
  }

  return (
    <>
      {box && (
        <div
          className="pointer-events-none fixed z-[60] rounded-xl border-2 border-[var(--emerald)]"
          style={{
            top: box.top - OUTLINE,
            left: box.left - OUTLINE,
            width: box.width + OUTLINE * 2,
            height: box.height + OUTLINE * 2,
          }}
        />
      )}
      <div
        ref={cardRef}
        className={cn(
          "fixed z-[70] max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--warm-200)] bg-white p-4 shadow-xl",
          place.pin === "left" && "left-6 w-80",
          place.pin === "right" && "right-6 w-80",
          place.pin === "full" && "inset-x-4",
        )}
        style={{ top: place.top }}
      >
        <p className="font-body text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          {chapterLabel(current.chapter)} · {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-base font-semibold text-[var(--text-primary)]">{current.title}</h2>
        <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">{current.body}</p>
        {current.demo && <TourExample demo={current.demo} />}
        {!onPage && (
          <p className="mt-2 font-body text-xs text-[var(--text-muted)]">
            Next opens this page. The tour stays with you.
          </p>
        )}
        <div className="mt-3 flex gap-1">
          {TOUR_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={index === step ? "h-1 flex-1 rounded-full bg-[var(--slate-950)]" : "h-1 flex-1 rounded-full bg-[var(--warm-200)]"}
            />
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => go("done")}
            className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            Skip tour
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => go(step === TOUR_STEPS.length - 1 ? "done" : step + 1)}
            className="flex-1 cursor-pointer rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
          >
            {step === TOUR_STEPS.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
