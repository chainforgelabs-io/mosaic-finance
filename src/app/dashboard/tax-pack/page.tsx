"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import type { TaxPackResult } from "@/lib/tax-pack/build";
import { formatMoney } from "@/lib/tracking/format";

export default function TaxPackPage() {
  const tier = usePlanStore((s) => s.user?.tier ?? "pulse");
  const [pack, setPack] = useState<TaxPackResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/tax-pack", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 402) {
          setLocked(true);
          return;
        }
        if (!res.ok) return;
        setPack(await res.json());
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="skeleton h-48 w-full" />;
  }

  if (locked || (tier !== "mastery" && !pack)) {
    return (
      <div className="rounded-xl border border-[var(--warm-200)] bg-white p-8">
        <Receipt className="size-8 text-[var(--emerald)]" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[var(--text-primary)]">
          Tax Year-End Pack
        </h1>
        <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
          Mastery includes a Canadian year-end checklist, estimated contribution
          rooms, and slips to expect — built from the accounts you already track.
        </p>
        <Link
          href="/dashboard/settings?tab=subscription"
          className="mt-6 inline-flex rounded-full bg-[var(--emerald)] px-5 py-2.5 font-display text-sm font-semibold text-white"
        >
          Upgrade to Mastery
        </Link>
      </div>
    );
  }

  if (!pack) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Tax Year-End Pack {pack.year}
        </h1>
        <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
          Educational summary from your Mosaic picture. Not a filing service or tax advice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <RoomCard
          label="RRSP room (est.)"
          value={pack.contributionRooms.rrsp}
        />
        <RoomCard
          label="TFSA room (est.)"
          value={pack.contributionRooms.tfsa}
        />
        <div className="rounded-xl border border-[var(--warm-200)] bg-white p-5">
          <p className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">
            FHSA
          </p>
          <p className="mt-2 font-display text-xl font-bold text-[var(--text-primary)]">
            {pack.contributionRooms.fhsa.eligible
              ? `${formatMoney(pack.contributionRooms.fhsa.annual)} / yr`
              : "Not eligible"}
          </p>
          {pack.contributionRooms.fhsa.reason && (
            <p className="mt-1 font-body text-xs text-[var(--text-muted)]">
              {pack.contributionRooms.fhsa.reason}
            </p>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Slips to expect</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-[var(--text-secondary)]">
          {pack.slips.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Year-end checklist</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-[var(--text-secondary)]">
          {pack.checklist.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--warm-200)] bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Deadlines</h2>
        <ul className="mt-3 space-y-2 font-body text-sm">
          {pack.deadlines.map((d) => (
            <li key={d.label} className="flex justify-between gap-4">
              <span className="text-[var(--text-secondary)]">{d.label}</span>
              <span className="tabular-nums text-[var(--text-primary)]">{d.date}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="font-body text-sm text-[var(--text-muted)]">{pack.harvestNote}</p>
    </div>
  );
}

function RoomCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white p-5">
      <p className="font-body text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-bold text-[var(--text-primary)]">
        {value == null ? "Add income to estimate" : formatMoney(value)}
      </p>
    </div>
  );
}
