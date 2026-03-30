"use client";

import { useState, useCallback } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { TierBadge } from "@/components/app/TierBadge";
import type { Tier } from "@/types";
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

const provinces = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
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
  const { user } = usePlanStore();

  const [alias, setAlias] = useState(user?.alias ?? "");
  const [province, setProvince] = useState(user?.province ?? "");
  const [employment, setEmployment] = useState(user?.employmentType ?? "");
  const [family, setFamily] = useState(user?.familyStructure ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

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
          {provinces.map((p) => (
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
        <div className="grid grid-cols-2 gap-3">
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

      <button
        onClick={handleSave}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--slate-950)] text-white font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-[var(--slate-950)]/90 transition-colors"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </div>
  );
}

// ─── Subscription Tab ─────────────────────────────────────────────

const tierFeatures: {
  tier: Tier;
  price: string;
  features: string[];
}[] = [
  {
    tier: "free",
    price: "$0/mo",
    features: [
      "1 financial plan",
      "Basic guided plan review with Charlie",
      "48-hour professional review",
      "Weekly market context",
    ],
  },
  {
    tier: "essential",
    price: "$14.99/mo",
    features: [
      "2 plan revisions/year",
      "Full guided plan review with Charlie",
      "24-hour professional review",
      "Weekly market context",
    ],
  },
  {
    tier: "pro",
    price: "$29.99/mo",
    features: [
      "Quarterly re-plans",
      "Priority guided plan review with Charlie",
      "12-hour professional review",
      "Personalized market context",
    ],
  },
  {
    tier: "premium",
    price: "$59.99/mo",
    features: [
      "Unlimited re-plans",
      "Full guided plan review with Charlie + follow-ups",
      "8-hour professional review",
      "Personalized market context",
      "Priority support",
    ],
  },
];

function SubscriptionTab() {
  const { user } = usePlanStore();
  const currentTier = user?.tier ?? "free";

  const handleManageBilling = () => {
    window.alert(
      "Stripe Customer Portal would open here. Wire to POST /api/stripe/portal for real billing management."
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mb-1">
            Current plan
          </p>
          <TierBadge tier={currentTier} />
        </div>
        <div className="ml-auto text-right">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            Billing period
          </p>
          <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)]">
            Monthly &middot; Renews Apr 4, 2026
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <button className="mt-4 w-full py-2 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors">
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
        onClick={handleManageBilling}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-[var(--emerald-dark)] transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Manage Billing
      </button>
    </div>
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
            "Generated financial plans",
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
              This will permanently delete your profile, conversations, financial
              plans, and all associated data. This action cannot be undone.
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
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? "bg-[var(--emerald)]" : "bg-[var(--warm-200)]"
      }`}
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
  const [planReady, setPlanReady] = useState(true);
  const [weeklyMarket, setWeeklyMarket] = useState(true);
  const [quarterlyRePlan, setQuarterlyRePlan] = useState(false);

  const notifications = [
    {
      label: "Plan ready",
      description: "Get notified when your financial plan has been reviewed and is ready to view.",
      enabled: planReady,
      onToggle: () => setPlanReady((v) => !v),
    },
    {
      label: "Weekly market update",
      description: "Receive a summary of the weekly market context report.",
      enabled: weeklyMarket,
      onToggle: () => setWeeklyMarket((v) => !v),
    },
    {
      label: "Quarterly re-plan reminder",
      description: "Reminder to review and update your financial plan every quarter.",
      enabled: quarterlyRePlan,
      onToggle: () => setQuarterlyRePlan((v) => !v),
    },
  ];

  return (
    <div className="space-y-1">
      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mb-4">
        Email notifications only at this time.
      </p>
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
          <Toggle enabled={n.enabled} onToggle={n.onToggle} />
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
        <div className="flex gap-1 border-b border-[var(--warm-200)] mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 -mb-px border-b-2 transition-colors font-[family-name:var(--font-display)] text-sm font-medium ${
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
