"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePlanStore } from "@/stores/plan-store";
import { TierBadge } from "@/components/app/TierBadge";
import type { Tier } from "@/types";
import {
  formatTierPrice,
  type BillingInterval,
} from "@/lib/config/pricing";
import { PROVINCES } from "@/lib/constants/provinces";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/config/profile-mappings";
import type { NotificationPreferences } from "@/types";
import {
  User,
  CreditCard,
  Shield,
  Bell,
  Check,
  ExternalLink,
  Trash2,
  Download,
  X,
} from "lucide-react";

type SettingsTab = "profile" | "subscription" | "privacy" | "notifications";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const employmentTypes = ["Employed", "Self-Employed", "Retired", "Student"];
const familyStructures = [
  "Single",
  "Married",
  "Common-Law",
  "Single Parent",
  "Family",
];

// ─── Profile Tab ──────────────────────────────────────────────────

function ProfileTab() {
  const { user, setUser } = usePlanStore();

  const [alias, setAlias] = useState(user?.alias ?? "");
  const [province, setProvince] = useState(user?.province ?? "");
  const [employment, setEmployment] = useState(user?.employmentType ?? "");
  const [family, setFamily] = useState(user?.familyStructure ?? "");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setAlias(user.alias ?? "");
    setProvince(user.province ?? "");
    setEmployment(user.employmentType ?? "");
    setFamily(user.familyStructure ?? "");
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          alias,
          province,
          employmentType: employment,
          familyStructure: family,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string"
            ? data.error
            : "Could not save profile. Please try again.",
        );
        return;
      }
      setUser({
        ...user,
        alias,
        province: province || undefined,
        employmentType: employment || undefined,
        familyStructure: family || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [alias, province, employment, family, setUser, user]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Alias
        </label>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-[var(--warm-200)] bg-white font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] focus:border-transparent transition-shadow"
        />
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mt-1">
          We never collect your legal name.
        </p>
      </div>

      <div>
        <label className="block font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Province
        </label>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-[var(--warm-200)] bg-white font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] focus:border-transparent transition-shadow"
        >
          <option value="">Select province</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Employment type
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {employmentTypes.map((type) => (
            <button
              key={type}
              onClick={() => setEmployment(type)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium font-[family-name:var(--font-body)] transition-colors ${
                employment === type
                  ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/30 text-[var(--emerald-dark)]"
                  : "border-[var(--warm-200)] bg-white text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Family structure
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {familyStructures.map((structure) => (
            <button
              key={structure}
              onClick={() => setFamily(structure)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium font-[family-name:var(--font-body)] transition-colors ${
                family === structure
                  ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/30 text-[var(--emerald-dark)]"
                  : "border-[var(--warm-200)] bg-white text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              {structure}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--error)]">
          {saveError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--slate-950)] text-white font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-[var(--slate-950)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : saving ? (
          "Saving…"
        ) : (
          "Save Changes"
        )}
      </button>
    </div>
  );
}

// ─── Subscription Tab ─────────────────────────────────────────────

function getTierFeatures(billing: BillingInterval): {
  tier: Tier;
  price: string;
  features: string[];
}[] {
  return [
    {
      tier: "snapshot",
      price: formatTierPrice("snapshot", billing),
      features: [
        "Financial Health Score",
        "Basic profile",
        "1 monthly check-in with Charlie (score-focused)",
        "No credit card",
      ],
    },
    {
      tier: "plan",
      price: formatTierPrice("plan", billing),
      features: [
        "Full conversational fact-find",
        "8-section Progress Report + PDF",
        "5 conversations/month with Charlie",
        "Life event education",
        "6-month score refresh",
      ],
    },
    {
      tier: "advisor",
      price: formatTierPrice("advisor", billing),
      features: [
        "Everything in Progress",
        "Unlimited conversations with Charlie",
        "Quarterly check-ins",
        "Priority report generation",
        "Portfolio monitoring",
        "Tax year-end report",
      ],
    },
  ];
}

function SubscriptionTabInner() {
  const { user } = usePlanStore();
  const currentTier = user?.tier ?? "snapshot";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const tierFeatures = getTierFeatures(billingInterval);

  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutCancelled, setCheckoutCancelled] = useState(false);

  useEffect(() => {
    const c = searchParams.get("checkout");
    if (c === "success") {
      setCheckoutSuccess(true);
      router.replace("/dashboard/settings", { scroll: false });
    } else if (c === "cancelled") {
      setCheckoutCancelled(true);
      router.replace("/dashboard/settings", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!checkoutSuccess && !checkoutCancelled) return;
    const t = setTimeout(() => {
      setCheckoutSuccess(false);
      setCheckoutCancelled(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [checkoutSuccess, checkoutCancelled]);

  const handleManageBilling = async () => {
    setBillingError(null);
    setBillingBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }
      if (res.status === 400 && data.error === "no_billing_account") {
        setBillingError(
          "No billing account yet. Subscribe to a paid plan using Upgrade below.",
        );
        return;
      }
      setBillingError(
        typeof data.error === "string"
          ? data.error
          : "Could not open billing portal. Please try again.",
      );
    } finally {
      setBillingBusy(false);
    }
  };

  const handleTierChange = async (targetTier: Tier) => {
    if (targetTier === currentTier) return;
    setBillingError(null);
    setBillingBusy(true);
    try {
      if (targetTier === "snapshot" && currentTier !== "snapshot") {
        const res = await fetch("/api/stripe/portal", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.url === "string") {
          window.location.href = data.url;
          return;
        }
        setBillingError(
          typeof data.error === "string"
            ? data.error
            : "Could not open billing portal. Please try again.",
        );
        return;
      }

      if (
        currentTier === "snapshot" &&
        (targetTier === "plan" || targetTier === "advisor")
      ) {
        const res = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            tier: targetTier,
            interval: billingInterval,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.url === "string") {
          window.location.href = data.url;
          return;
        }
        setBillingError(
          typeof data.error === "string"
            ? data.error
            : "Could not start checkout. Please try again.",
        );
        return;
      }

      if (currentTier !== "snapshot") {
        const res = await fetch("/api/stripe/portal", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.url === "string") {
          window.location.href = data.url;
          return;
        }
        if (res.status === 400 && data.error === "no_billing_account") {
          setBillingError(
            "We could not find your billing account. Please contact support.",
          );
          return;
        }
        setBillingError(
          typeof data.error === "string"
            ? data.error
            : "Could not open billing portal. Please try again.",
        );
      }
    } finally {
      setBillingBusy(false);
    }
  };

  const billingPeriodLabel =
    currentTier === "snapshot"
      ? "No active subscription"
      : "Active subscription · Manage in Stripe";

  return (
    <div className="space-y-6">
      {checkoutSuccess && (
        <div className="rounded-lg border border-[var(--emerald)] bg-[var(--emerald-soft)]/30 px-4 py-3 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
          Subscription activated! Your plan will update shortly.
        </div>
      )}
      {checkoutCancelled && (
        <div className="rounded-lg border border-[var(--warm-200)] bg-[var(--warm-50)] px-4 py-3 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
          Checkout was cancelled. You can subscribe anytime from here.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mb-1">
            Current plan
          </p>
          <TierBadge tier={currentTier} />
        </div>
        <div className="text-left sm:ml-auto sm:text-right">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            Billing period
          </p>
          <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
            {billingPeriodLabel}
          </p>
        </div>
      </div>

      {billingError && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--error)]">
          {billingError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
          New subscriptions — billing
        </span>
        <div className="inline-flex rounded-full border border-[var(--warm-200)] bg-white p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-display)] text-xs font-semibold transition-colors ${
              billingInterval === "monthly"
                ? "bg-[var(--slate-950)] text-white"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("annual")}
            className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-display)] text-xs font-semibold transition-colors ${
              billingInterval === "annual"
                ? "bg-[var(--slate-950)] text-white"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tierFeatures.map(({ tier, price, features }) => {
          const isCurrent = tier === currentTier;
          return (
            <div
              key={tier}
              className={`rounded-lg border p-5 transition-colors ${
                isCurrent
                  ? "border-[var(--emerald)] bg-[var(--emerald-soft)]/10"
                  : "border-[var(--warm-200)] bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <TierBadge tier={tier} />
                <span className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
                  {price}
                </span>
              </div>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isCurrent
                          ? "text-[var(--emerald)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    />
                    <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="mt-4 text-center font-[family-name:var(--font-display)] text-sm font-medium text-[var(--emerald)]">
                  Current Plan
                </p>
              ) : (
                <button
                  type="button"
                  disabled={billingBusy}
                  onClick={() => void handleTierChange(tier)}
                  className="mt-4 w-full py-2 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tierFeatures.findIndex((t) => t.tier === tier) >
                  tierFeatures.findIndex((t) => t.tier === currentTier)
                    ? "Upgrade"
                    : "Downgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={billingBusy}
        onClick={() => void handleManageBilling()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ExternalLink className="w-4 h-4" />
        {billingBusy ? "Opening…" : "Manage Billing"}
      </button>
    </div>
  );
}

function SubscriptionTab() {
  return (
    <Suspense
      fallback={
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
          Loading subscription…
        </p>
      }
    >
      <SubscriptionTabInner />
    </Suspense>
  );
}

// ─── Privacy Tab ──────────────────────────────────────────────────

function PrivacyTab() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleExportData = () => {
    window.alert(
      "Data export would trigger here. Wire to GET /api/user/export for real data export."
    );
  };

  const handleDeleteData = () => {
    if (deleteConfirmText === "DELETE") {
      window.alert(
        "All data would be deleted. Wire to DELETE /api/user/data for Supabase cascade deletion."
      );
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-3">
          What Mosaic Finance stores
        </h3>
        <ul className="space-y-2">
          {[
            "Your chosen alias (not your legal name)",
            "Province, age, employment type, family structure",
            "Conversation transcripts (encrypted at rest)",
            "Investment holdings and risk profile",
            "Generated Progress Reports",
            "Notification preferences",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-3">
          What Mosaic Finance never collects
        </h3>
        <ul className="space-y-2">
          {[
            "Your legal name or government ID",
            "Bank account numbers or credentials",
            "Social insurance number (SIN)",
            "Exact home address",
            "Employer name or details",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--warm-200)] bg-white text-[var(--text-primary)] font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-[var(--warm-50)] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export My Data
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--error)] text-[var(--error)] font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete All My Data
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-xl border border-[var(--warm-200)] p-6 max-w-md w-full shadow-lg">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[var(--error)]" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
                Delete all data?
              </h3>
            </div>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mb-4">
              This will permanently delete your profile, conversations, Progress
              Reports, and all associated data. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Type <span className="font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--warm-200)] bg-white font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:border-transparent transition-shadow"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-[var(--warm-200)] text-[var(--text-secondary)] font-[family-name:var(--font-display)] text-sm font-medium hover:bg-[var(--warm-50)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deleteConfirmText !== "DELETE"}
                className="px-4 py-2 rounded-lg bg-[var(--error)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? "bg-[var(--emerald)]" : "bg-[var(--warm-200)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function NotificationsTab() {
  const { user, setUser } = usePlanStore();
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;

  const [planReady, setPlanReady] = useState(defaults.plan_ready);
  const [weeklyMarket, setWeeklyMarket] = useState(defaults.weekly_market);
  const [quarterlyRePlan, setQuarterlyRePlan] = useState(defaults.quarterly_replan);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);

  // Sync from server only when the signed-in user changes (avoid clobbering optimistic toggles during PATCH).
  useEffect(() => {
    if (!user) return;
    const p = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
    setPlanReady(p.plan_ready);
    setWeeklyMarket(p.weekly_market);
    setQuarterlyRePlan(p.quarterly_replan);
  }, [user?.id]);

  const persist = useCallback(
    async (next: NotificationPreferences) => {
      if (!user) return;
      setNotifError(null);
      setNotifSaving(true);
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ notifications: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const p = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
          setPlanReady(p.plan_ready);
          setWeeklyMarket(p.weekly_market);
          setQuarterlyRePlan(p.quarterly_replan);
          setNotifError(
            typeof data.error === "string"
              ? data.error
              : "Could not save notification preferences.",
          );
          return;
        }
        setUser({ ...user, notificationPreferences: next });
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 1500);
      } finally {
        setNotifSaving(false);
      }
    },
    [user, setUser],
  );

  const notifications = [
    {
      label: "Progress Report ready",
      description:
        "Get notified when your Progress Report is ready to view.",
      enabled: planReady,
      onToggle: () => {
        const next: NotificationPreferences = {
          plan_ready: !planReady,
          weekly_market: weeklyMarket,
          quarterly_replan: quarterlyRePlan,
        };
        setPlanReady(next.plan_ready);
        void persist(next);
      },
    },
    {
      label: "Weekly market update",
      description: "Receive a summary of the weekly market context report.",
      enabled: weeklyMarket,
      onToggle: () => {
        const next: NotificationPreferences = {
          plan_ready: planReady,
          weekly_market: !weeklyMarket,
          quarterly_replan: quarterlyRePlan,
        };
        setWeeklyMarket(next.weekly_market);
        void persist(next);
      },
    },
    {
      label: "Quarterly check-in reminder",
      description:
        "Reminder to review and update your Progress Report every quarter.",
      enabled: quarterlyRePlan,
      onToggle: () => {
        const next: NotificationPreferences = {
          plan_ready: planReady,
          weekly_market: weeklyMarket,
          quarterly_replan: !quarterlyRePlan,
        };
        setQuarterlyRePlan(next.quarterly_replan);
        void persist(next);
      },
    },
  ];

  return (
    <div className="space-y-1">
      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mb-4">
        Email notifications only at this time.
      </p>
      {notifError && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--error)] mb-2">
          {notifError}
        </p>
      )}
      {notifSaved && (
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--emerald)] mb-2 flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          Preferences saved
        </p>
      )}
      {notifications.map((n) => (
        <div
          key={n.label}
          className="flex items-center justify-between py-4 border-b border-[var(--warm-200)] last:border-0"
        >
          <div className="flex-1 mr-4">
            <p className="font-[family-name:var(--font-display)] text-sm font-medium text-[var(--text-primary)]">
              {n.label}
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] mt-0.5">
              {n.description}
            </p>
          </div>
          <Toggle
            enabled={n.enabled}
            onToggle={n.onToggle}
            disabled={notifSaving || !user}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          Settings
        </h1>
      </div>

      <div className="max-w-[680px]">
        {/* Tabs */}
        <div className="-mx-1 mb-8 overflow-x-auto border-b border-[var(--warm-200)] px-1">
          <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-3 -mb-px border-b-2 transition-colors font-[family-name:var(--font-display)] text-sm font-medium sm:px-4 ${
                  isActive
                    ? "border-[var(--emerald)] text-[var(--emerald)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "subscription" && <SubscriptionTab />}
          {activeTab === "privacy" && <PrivacyTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}
