"use client";

import { useEffect, useState } from "react";
import { Users, User, Briefcase, Baby } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HouseholdMemberRow {
  relationship: string;
  age: number | null;
  sex: string | null;
  occupation: string | null;
  annual_income: number | null;
  is_dependant: boolean;
}

interface ProfileRow {
  alias: string;
  age: number | null;
  sex: string | null;
  employment_type: string | null;
  family_structure: string | null;
  annual_income: number | null;
}

const RELATIONSHIP_ICONS: Record<string, typeof User> = {
  spouse: Users,
  child: Baby,
  parent: User,
  sibling: User,
  other: User,
};

export function HouseholdCard() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: m }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("alias, age, sex, employment_type, family_structure, annual_income")
          .eq("id", user.id)
          .single(),
        supabase
          .from("household_members")
          .select("relationship, age, sex, occupation, annual_income, is_dependant")
          .eq("user_id", user.id),
      ]);

      if (p) setProfile(p);
      if (m) setMembers(m);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
        <div className="skeleton h-6 w-40 mb-4" />
        <div className="skeleton h-20 w-full" />
      </div>
    );
  }

  if (!profile) return null;

  const totalHouseholdIncome =
    (Number(profile.annual_income) || 0) +
    members.reduce((sum, m) => sum + (Number(m.annual_income) || 0), 0);

  const dependants = members.filter((m) => m.is_dependant);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-[var(--emerald)]" />
        <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
          Household Profile
        </h3>
      </div>

      {/* Primary client */}
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-[var(--warm-50)] p-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-[var(--emerald)]/10">
          <User className="size-4 text-[var(--emerald)]" />
        </div>
        <div className="flex-1">
          <p className="font-body text-[14px] font-medium text-[var(--text-primary)]">
            {profile.alias}
            <span className="ml-2 font-normal text-[var(--text-muted)]">
              (You)
            </span>
          </p>
          <p className="font-body text-[12px] text-[var(--text-secondary)]">
            {[
              profile.age ? `${profile.age}y` : null,
              profile.employment_type,
              profile.annual_income
                ? `$${Number(profile.annual_income).toLocaleString()}/yr`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {/* Household members */}
      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((m, i) => {
            const Icon = RELATIONSHIP_ICONS[m.relationship] ?? User;
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--warm-50)] p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--warm-200)]/50">
                  <Icon className="size-4 text-[var(--text-muted)]" />
                </div>
                <div className="flex-1">
                  <p className="font-body text-[14px] font-medium capitalize text-[var(--text-primary)]">
                    {m.relationship}
                    {m.is_dependant && (
                      <span className="ml-2 rounded bg-[var(--warm-200)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                        Dependant
                      </span>
                    )}
                  </p>
                  <p className="font-body text-[12px] text-[var(--text-secondary)]">
                    {[
                      m.age ? `${m.age}y` : null,
                      m.occupation,
                      m.annual_income
                        ? `$${Number(m.annual_income).toLocaleString()}/yr`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--warm-200)] p-3 text-center">
          <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Household Income
          </p>
          <p className="mt-1 font-display text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">
            ${totalHouseholdIncome.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--warm-200)] p-3 text-center">
          <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Dependants
          </p>
          <p className="mt-1 font-display text-[18px] font-semibold text-[var(--text-primary)]">
            {dependants.length}
          </p>
        </div>
      </div>
    </div>
  );
}
