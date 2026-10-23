"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const STEPS = [
  {
    path: "/dashboard",
    nav: "nav-dashboard",
    page: "page-dashboard",
    title: "Your dashboard",
    body: "This is the picture after the conversation with Charlie: Health Score, this week, and the Progress Report when it is ready. Educational information, not advice.",
  },
  {
    path: "/dashboard/cash-flow",
    nav: "nav-cash-flow",
    page: "page-cash-flow",
    title: "Cash Flow",
    body: "Put a number on each month for money in, expenses, and savings. Then log spending each week so tracking can compare against the plan.",
  },
  {
    path: "/dashboard/assets",
    nav: "nav-net-worth",
    page: "page-net-worth",
    title: "Net Worth",
    body: "The accounts and property from the conversation are here. Check them, save the first snapshot, and pick the day of the month for a reminder.",
  },
  {
    path: "/dashboard/goals",
    nav: "nav-goals",
    page: "page-goals",
    title: "Goals",
    body: "The goals from the conversation are listed. Edit an amount or date, or tap Looks right if they still match.",
  },
  {
    path: "/dashboard/meeting",
    nav: "nav-charlie",
    page: "page-charlie",
    title: "Charlie stays",
    body: "Ask Charlie about any of these numbers any time. This link stays in the sidebar.",
  },
] as const;

function stepKey(userId: string): string {
  return `mosaic-tour-step:${userId}`;
}

export function AppTour({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setTimeout(() => {
      const welcome = new URLSearchParams(window.location.search).get("welcome") === "1";
      const stored = localStorage.getItem(stepKey(userId));
      if (welcome) {
        localStorage.setItem(stepKey(userId), "0");
        setStep(0);
        window.history.replaceState({}, "", pathname);
        return;
      }
      if (stored == null || stored === "done") {
        setStep(null);
        return;
      }
      const index = Number(stored);
      setStep(Number.isInteger(index) && index >= 0 && index < STEPS.length ? index : null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userId, pathname]);

  const current = step != null ? STEPS[step] : null;
  const onPage =
    current != null &&
    (pathname === current.path || (current.path !== "/dashboard" && pathname.startsWith(current.path)));

  useEffect(() => {
    if (!current) return;
    const targets = onPage ? [current.page, current.nav] : [current.nav];
    const place = () => {
      const nodes = targets.flatMap((target) => [...document.querySelectorAll(`[data-tour="${target}"]`)]);
      let top = 0;
      let left = 0;
      let width = 0;
      let height = 0;
      let found = false;
      nodes.forEach((node) => {
        if (found) return;
        const next = node.getBoundingClientRect();
        if (next.width > 0 && next.height > 0) {
          top = next.top;
          left = next.left;
          width = next.width;
          height = next.height;
          found = true;
        }
      });
      if (!found) {
        setBox(null);
        return;
      }
      setBox({ top, left, width, height });
    };
    const timer = window.setTimeout(place, 0);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [current, onPage, pathname]);

  if (!userId || step == null || !current) return null;

  function persist(next: number | "done") {
    if (!userId) return;
    localStorage.setItem(stepKey(userId), String(next));
    setStep(next === "done" ? null : next);
  }

  function goNext() {
    const following = STEPS[step! + 1];
    if (!following) {
      persist("done");
      return;
    }
    persist(step! + 1);
    if (pathname !== following.path) router.push(following.path);
  }

  return (
    <>
      {box && (
        <div
          className="pointer-events-none fixed z-[60] rounded-lg ring-2 ring-[var(--emerald)] ring-offset-2 ring-offset-transparent"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <div className="fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-md rounded-xl border border-[var(--warm-200)] bg-white p-4 shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0">
        <p className="font-body text-[11px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          How Mosaic works · {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-base font-semibold text-[var(--text-primary)]">{current.title}</h2>
        <p className="mt-1 font-body text-sm text-[var(--text-secondary)]">{current.body}</p>
        {!onPage && (
          <p className="mt-2 font-body text-xs text-[var(--text-muted)]">
            Next opens this page. The tour stays with you.
          </p>
        )}
        <div className="mt-3 flex gap-1">
          {STEPS.map((item, index) => (
            <span
              key={item.path}
              className={index === step ? "h-1 flex-1 rounded-full bg-[var(--slate-950)]" : "h-1 flex-1 rounded-full bg-[var(--warm-200)]"}
            />
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => persist("done")}
            className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
          >
            Skip tour
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                const previous = STEPS[step - 1];
                persist(step - 1);
                if (pathname !== previous.path) router.push(previous.path);
              }}
              className="flex-1 cursor-pointer rounded-lg border border-[var(--warm-200)] py-2.5 font-display text-sm font-semibold"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="flex-1 cursor-pointer rounded-lg bg-[var(--emerald)] py-2.5 font-display text-sm font-semibold text-white"
          >
            {step === STEPS.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
