"use client";

import { ClubCard } from "@/components/app/ClubCard";

export default function MoneyClubPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 font-display text-2xl font-bold text-[var(--text-primary)]">
        Money Club
      </h1>
      <ClubCard />
    </div>
  );
}
