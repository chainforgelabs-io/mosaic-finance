"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Map } from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import { TOUR_CHAPTERS, type TourChapter } from "@/lib/onboarding/tour";
import { TOUR_OPEN_EVENT, openTour } from "@/components/app/ReplayTourLink";
import { cn } from "@/lib/utils";

export function TourMenu({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const userId = usePlanStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);

  function start(chapter: TourChapter | "all") {
    if (!userId) return;
    const path = openTour(userId, chapter);
    setOpen(false);
    onNavigate?.();
    if (window.location.pathname === path) {
      window.dispatchEvent(new Event(TOUR_OPEN_EVENT));
      if (window.location.search) router.replace(path);
      return;
    }
    router.push(`${path}?tour=1`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-white",
          mobile && "px-3 py-3",
        )}
      >
        <Map className={mobile ? "size-5" : "size-[18px]"} />
        <span className="font-display text-sm font-medium md:max-lg:hidden">Tour</span>
      </button>
      {open && (
        <div className={cn("mb-2 flex flex-col gap-1", mobile ? "pl-3" : "pl-2 md:max-lg:hidden")}>
          <ChapterButton label="Whole tour" onClick={() => start("all")} />
          {TOUR_CHAPTERS.map((chapter) => (
            <ChapterButton key={chapter.id} label={chapter.label} onClick={() => start(chapter.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-1.5 text-left font-body text-xs text-white/70 hover:bg-white/5 hover:text-white"
    >
      {label}
    </button>
  );
}
