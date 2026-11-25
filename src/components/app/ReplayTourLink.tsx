"use client";

import { useRouter } from "next/navigation";
import { usePlanStore } from "@/stores/plan-store";
import { TOUR_STEPS, chapterStart, rememberTourStep, type TourChapter } from "@/lib/onboarding/tour";

export const TOUR_OPEN_EVENT = "mosaic-tour-open";

export function openTour(userId: string, chapter: TourChapter | "all"): string {
  const index = chapterStart(chapter);
  rememberTourStep(userId, index);
  return TOUR_STEPS[index].path;
}

export function ReplayTourLink({
  chapter,
  label = "How this page works",
}: {
  chapter: TourChapter;
  label?: string;
}) {
  const router = useRouter();
  const userId = usePlanStore((s) => s.user?.id);

  return (
    <button
      type="button"
      onClick={() => {
        if (!userId) return;
        const path = openTour(userId, chapter);
        if (window.location.pathname === path) {
          window.dispatchEvent(new Event(TOUR_OPEN_EVENT));
          return;
        }
        router.push(`${path}?tour=1`);
      }}
      className="font-display text-sm font-semibold text-[var(--emerald-dark)] underline"
    >
      {label}
    </button>
  );
}
