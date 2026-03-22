"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { CurrentAllocationChart } from "@/components/charts/CurrentAllocationChart";
import { DebtBreakdownChart } from "@/components/charts/DebtBreakdownChart";
import { FinancialCard } from "@/components/app/FinancialCard";
import {
  Award,
  Car,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Gem,
  Home,
  Landmark,
  MapPin,
  Package,
  Pencil,
  PiggyBank,
  Plus,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ---------- Types ---------- */

interface Holding {
  ticker: string;
  name: string;
  balance: number;
  units: number | null;
}

interface AccountRow {
  id: string;
  account_type: string;
  holdings: Holding[];
  total_value: number;
  source: string;
  created_at: string;
}

interface FinancialProfile {
  annual_income: number | null;
  monthly_expenses: number | null;
  monthly_savings: number | null;
  emergency_fund_months: number | null;
  major_debts: { type: string; amount: number; rate?: number; monthly_payment?: number }[] | null;
  financial_goals: { goal: string; target_amount?: number; target_year?: number }[] | null;
}

interface FixedAsset {
  id: string;
  category: string;
  name: string;
  estimated_value: number;
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  is_primary_residence: boolean;
  property_city: string | null;
  property_province: string | null;
  property_sqft: number | null;
  property_bedrooms: number | null;
  property_bathrooms: number | null;
  property_year_built: number | null;
  property_features: string[] | null;
  created_at: string;
}

/* ---------- Helpers ---------- */

function fmt(n: number | null | undefined): string {
  if (n == null) return "--";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number | null | undefined): string {
  if (n == null) return "--";
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ACCOUNT_LABELS: Record<string, string> = {
  RRSP: "RRSP", TFSA: "TFSA", FHSA: "FHSA", RESP: "RESP", RDSP: "RDSP", RRIF: "RRIF",
  "DB-RPP": "Defined Benefit Pension", "DC-RPP": "Defined Contribution Pension",
  "Hybrid-RPP": "Hybrid RPP", "Target-Benefit": "Target Benefit",
  "Group-RRSP": "Group RRSP", "Group-TFSA": "Group TFSA",
  DPSP: "DPSP", EPSP: "EPSP", PRPP: "PRPP", VRSP: "VRSP", SPP: "SPP",
  ESOP: "ESOP", ESPP: "ESPP", DSPP: "DSPP", RSU: "RSU",
  "Stock-Options": "Stock Options", "Phantom-Stock": "Phantom Stock / SARs", EOT: "EOT",
  LIRA: "LIRA", LRSP: "LRSP", RLSP: "RLSP", LIF: "LIF", LRIF: "LRIF", PRIF: "PRIF", RLIF: "RLIF",
  "non-registered": "Non-Registered", "Non-Reg": "Non-Registered",
  Joint: "Joint Account", Corporate: "Corporate Account",
  "In-Trust": "In-Trust Account", Annuity: "Prescribed Annuity",
  pension: "Pension",
};

const CATEGORIES = ["real_estate", "vehicle", "land", "precious_metals", "collectibles", "other"] as const;
type AssetCategory = (typeof CATEGORIES)[number];

const CATEGORY_CONFIG: Record<AssetCategory, { label: string; icon: LucideIcon }> = {
  real_estate: { label: "Real Estate", icon: Home },
  vehicle: { label: "Vehicles", icon: Car },
  land: { label: "Land", icon: MapPin },
  precious_metals: { label: "Precious Metals", icon: Gem },
  collectibles: { label: "Collectibles", icon: Award },
  other: { label: "Other Assets", icon: Package },
};

const PROVINCES = [
  { value: "AB", label: "Alberta" }, { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" }, { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland" }, { value: "NT", label: "Northwest Territories" },
  { value: "NS", label: "Nova Scotia" }, { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" }, { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" }, { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

const FEATURE_OPTIONS = ["Pool", "Garage", "Basement", "Renovated", "Deck/Patio", "Fireplace", "Central Air", "Solar"];

/* ---------- Account Card ---------- */

function AccountCard({ account }: { account: AccountRow }) {
  const [expanded, setExpanded] = useState(false);
  const label = ACCOUNT_LABELS[account.account_type] ?? account.account_type;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
            <Landmark className="size-4 text-[var(--emerald)]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">{label}</p>
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
              {account.holdings.length} holding{account.holdings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-display)] font-bold text-lg tabular-nums text-[var(--text-primary)]">{fmtFull(account.total_value)}</span>
          {expanded ? <ChevronUp className="size-4 text-[var(--text-muted)]" /> : <ChevronDown className="size-4 text-[var(--text-muted)]" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--warm-200)] px-5 py-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--warm-100)]">
                <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Holding</th>
                <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">Units</th>
                <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {account.holdings.map((h, i) => (
                <tr key={i} className="border-b border-[var(--warm-50)] last:border-0">
                  <td className="py-2.5 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">{h.ticker || h.name || "\u2014"}</td>
                  <td className="py-2.5 text-right font-[family-name:var(--font-body)] text-sm tabular-nums text-[var(--text-secondary)]">{h.units != null ? h.units.toLocaleString() : "\u2014"}</td>
                  <td className="py-2.5 text-right font-[family-name:var(--font-body)] text-sm font-medium tabular-nums text-[var(--text-primary)]">{fmtFull(h.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Debt helpers ---------- */

function parseDebtFromPlan(raw: string): { name: string; amount: number; rate: string } {
  const nameMatch = raw.match(/^([^(]+)/);
  const amountMatch = raw.match(/\$([0-9,]+)/);
  const rateMatch = raw.match(/([\d.]+%)/);
  return {
    name: nameMatch?.[1]?.trim() ?? raw,
    amount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0,
    rate: rateMatch?.[1] ?? "",
  };
}

/* ---------- Fixed Asset Form ---------- */

interface AssetFormData {
  category: AssetCategory;
  name: string;
  estimated_value: string;
  purchase_price: string;
  purchase_date: string;
  notes: string;
  is_primary_residence: boolean;
  property_city: string;
  property_province: string;
  property_sqft: string;
  property_bedrooms: string;
  property_bathrooms: string;
  property_year_built: string;
  property_features: string[];
  custom_feature: string;
}

const EMPTY_FORM: AssetFormData = {
  category: "real_estate", name: "", estimated_value: "", purchase_price: "",
  purchase_date: "", notes: "", is_primary_residence: false,
  property_city: "", property_province: "",
  property_sqft: "", property_bedrooms: "", property_bathrooms: "",
  property_year_built: "", property_features: [], custom_feature: "",
};

function assetToForm(a: FixedAsset): AssetFormData {
  return {
    category: a.category as AssetCategory,
    name: a.name,
    estimated_value: String(a.estimated_value),
    purchase_price: a.purchase_price != null ? String(a.purchase_price) : "",
    purchase_date: a.purchase_date ?? "",
    notes: a.notes ?? "",
    is_primary_residence: a.is_primary_residence,
    property_city: a.property_city ?? "",
    property_province: a.property_province ?? "",
    property_sqft: a.property_sqft != null ? String(a.property_sqft) : "",
    property_bedrooms: a.property_bedrooms != null ? String(a.property_bedrooms) : "",
    property_bathrooms: a.property_bathrooms != null ? String(a.property_bathrooms) : "",
    property_year_built: a.property_year_built != null ? String(a.property_year_built) : "",
    property_features: a.property_features ?? [],
    custom_feature: "",
  };
}

function formToPayload(f: AssetFormData) {
  return {
    category: f.category,
    name: f.name,
    estimated_value: parseFloat(f.estimated_value) || 0,
    purchase_price: f.purchase_price ? parseFloat(f.purchase_price) : null,
    purchase_date: f.purchase_date || null,
    notes: f.notes || null,
    is_primary_residence: f.category === "real_estate" ? f.is_primary_residence : false,
    property_city: f.category === "real_estate" && f.property_city ? f.property_city : null,
    property_province: f.category === "real_estate" && f.property_province ? f.property_province : null,
    property_sqft: f.category === "real_estate" && f.property_sqft ? parseInt(f.property_sqft) : null,
    property_bedrooms: f.category === "real_estate" && f.property_bedrooms ? parseInt(f.property_bedrooms) : null,
    property_bathrooms: f.category === "real_estate" && f.property_bathrooms ? parseFloat(f.property_bathrooms) : null,
    property_year_built: f.category === "real_estate" && f.property_year_built ? parseInt(f.property_year_built) : null,
    property_features: f.category === "real_estate" && f.property_features.length > 0 ? f.property_features : null,
  };
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-[var(--warm-200)] bg-white text-sm font-[family-name:var(--font-body)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:border-[var(--emerald)]";
const labelCls = "block font-[family-name:var(--font-body)] text-xs font-medium text-[var(--text-secondary)] mb-1";

function FixedAssetForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: AssetFormData;
  onSave: (data: AssetFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (field: keyof AssetFormData, value: string | string[] | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  const isNonPrimaryRealEstate = form.category === "real_estate" && !form.is_primary_residence;
  const purchasePriceRequired = isNonPrimaryRealEstate;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Category</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Primary Residence" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Estimated Value ($)</label>
          <input type="number" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            Purchase Price ($){purchasePriceRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input type="number" value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} placeholder={purchasePriceRequired ? "Required for capital gains" : "Optional"} className={inputCls} />
          {purchasePriceRequired && !form.purchase_price && (
            <p className="font-[family-name:var(--font-body)] text-xs text-red-500 mt-1">Required for non-primary residence (capital gains tax planning)</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Purchase Date</label>
          <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <input type="text" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" className={inputCls} />
        </div>
      </div>

      {form.category === "real_estate" && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => set("is_primary_residence", !form.is_primary_residence)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              form.is_primary_residence ? "bg-[var(--emerald)]" : "bg-[var(--warm-200)]",
            )}
          >
            <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", form.is_primary_residence ? "translate-x-5" : "translate-x-0")} />
          </button>
          <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">This is my primary residence</span>
        </div>
      )}

      {form.category === "real_estate" && (
        <>
          <div className="border-t border-[var(--warm-100)] pt-4">
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] mb-3">Property Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={form.property_city} onChange={(e) => set("property_city", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Province</label>
                <select value={form.property_province} onChange={(e) => set("property_province", e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sq Ft</label>
                <input type="number" value={form.property_sqft} onChange={(e) => set("property_sqft", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bedrooms</label>
                <input type="number" value={form.property_bedrooms} onChange={(e) => set("property_bedrooms", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bathrooms</label>
                <input type="number" step="0.5" value={form.property_bathrooms} onChange={(e) => set("property_bathrooms", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Year Built</label>
                <input type="number" value={form.property_year_built} onChange={(e) => set("property_year_built", e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Features</label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((feat) => {
                const active = form.property_features.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => set("property_features", active ? form.property_features.filter((f) => f !== feat) : [...form.property_features, feat])}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      active ? "bg-[var(--emerald)] text-white border-[var(--emerald)]" : "bg-white text-[var(--text-secondary)] border-[var(--warm-200)] hover:border-[var(--emerald)]",
                    )}
                  >
                    {feat}
                  </button>
                );
              })}
              {form.property_features.filter((f) => !FEATURE_OPTIONS.includes(f)).map((feat) => (
                <button
                  key={feat}
                  type="button"
                  onClick={() => set("property_features", form.property_features.filter((f) => f !== feat))}
                  className="px-3 py-1 rounded-full text-xs font-medium border bg-[var(--emerald)] text-white border-[var(--emerald)] transition-colors"
                >
                  {feat} &times;
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={form.custom_feature}
                onChange={(e) => set("custom_feature", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.custom_feature.trim()) {
                    e.preventDefault();
                    if (!form.property_features.includes(form.custom_feature.trim())) {
                      set("property_features", [...form.property_features, form.custom_feature.trim()]);
                    }
                    set("custom_feature", "");
                  }
                }}
                placeholder="Add custom feature..."
                className={cn(inputCls, "flex-1")}
              />
              <button
                type="button"
                onClick={() => {
                  if (form.custom_feature.trim() && !form.property_features.includes(form.custom_feature.trim())) {
                    set("property_features", [...form.property_features, form.custom_feature.trim()]);
                    set("custom_feature", "");
                  }
                }}
                className="px-3 py-2 rounded-lg border border-[var(--warm-200)] text-[var(--text-secondary)] font-[family-name:var(--font-display)] text-xs font-semibold hover:bg-[var(--warm-50)] transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name || !form.estimated_value || (purchasePriceRequired && !form.purchase_price)}
          className="px-5 py-2 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Asset"}
        </button>
        <button onClick={onCancel} className="px-5 py-2 rounded-lg border border-[var(--warm-200)] text-[var(--text-secondary)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--warm-50)] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- Fixed Asset Card ---------- */

function FixedAssetCard({
  asset,
  onEdit,
  onDelete,
}: {
  asset: FixedAsset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const config = CATEGORY_CONFIG[asset.category as AssetCategory] ?? CATEGORY_CONFIG.other;
  const Icon = config.icon;
  const province = PROVINCES.find((p) => p.value === asset.property_province);

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
            <Icon className="size-4 text-[var(--emerald)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">{asset.name}</p>
              {asset.is_primary_residence && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-[var(--emerald)]">Primary</span>
              )}
            </div>
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-[var(--warm-50)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <Pencil className="size-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500 transition-colors">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="font-[family-name:var(--font-display)] font-bold text-xl tabular-nums text-[var(--text-primary)] mb-2">
        {fmtFull(asset.estimated_value)}
      </p>

      {asset.purchase_price != null && (
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
          Purchased for {fmtFull(asset.purchase_price)}
          {asset.purchase_date && ` on ${new Date(asset.purchase_date).toLocaleDateString("en-CA", { month: "short", year: "numeric" })}`}
        </p>
      )}

      {asset.category === "real_estate" && (asset.property_city || asset.property_sqft || asset.property_bedrooms != null) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {asset.property_city && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-xs font-medium text-[var(--text-secondary)]">
              {asset.property_city}{province ? `, ${province.value}` : ""}
            </span>
          )}
          {asset.property_sqft != null && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-xs font-medium text-[var(--text-secondary)]">
              {asset.property_sqft.toLocaleString()} sqft
            </span>
          )}
          {asset.property_bedrooms != null && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-xs font-medium text-[var(--text-secondary)]">
              {asset.property_bedrooms} bed
            </span>
          )}
          {asset.property_bathrooms != null && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-xs font-medium text-[var(--text-secondary)]">
              {asset.property_bathrooms} bath
            </span>
          )}
          {asset.property_year_built != null && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--warm-50)] text-xs font-medium text-[var(--text-secondary)]">
              Built {asset.property_year_built}
            </span>
          )}
          {asset.property_features?.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded-full bg-emerald-50 text-xs font-medium text-[var(--emerald)]">
              {f}
            </span>
          ))}
        </div>
      )}

      {asset.notes && (
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mt-2 italic">{asset.notes}</p>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function AssetsPage() {
  const { rawPlanData } = usePlanStore();
  const [holdings, setHoldings] = useState<AccountRow[]>([]);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [householdIncome, setHouseholdIncome] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/holdings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings ?? []);
        setProfile(data.financialProfile ?? null);
        setFixedAssets(data.fixedAssets ?? []);
        setHouseholdIncome(data.householdIncome ?? null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSaveAsset(formData: AssetFormData) {
    setSaving(true);
    try {
      const payload = formToPayload(formData);
      if (editingAsset) {
        const res = await fetch("/api/fixed-assets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingAsset.id, ...payload }),
          credentials: "include",
        });
        if (res.ok) {
          const { asset } = await res.json();
          setFixedAssets((prev) => prev.map((a) => (a.id === asset.id ? asset : a)));
        }
      } else {
        const res = await fetch("/api/fixed-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (res.ok) {
          const { asset } = await res.json();
          setFixedAssets((prev) => [asset, ...prev]);
        }
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
      setShowForm(false);
      setEditingAsset(null);
    }
  }

  async function handleDeleteAsset(id: string) {
    try {
      const res = await fetch(`/api/fixed-assets?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setFixedAssets((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently fail
    }
  }

  const diag = rawPlanData?.financial_health_diagnostic as Record<string, unknown> | undefined;
  const debtPlan = rawPlanData?.debt_elimination_plan as Record<string, unknown> | undefined;
  const avalanche = debtPlan?.avalanche_method as Record<string, unknown> | undefined;
  const debtOrder = (avalanche?.order as string[]) ?? [];

  const investmentTotal = holdings.reduce((sum, a) => sum + a.total_value, 0);
  const fixedTotal = fixedAssets.reduce((sum, a) => sum + a.estimated_value, 0);
  const totalAssets = investmentTotal + fixedTotal;
  const totalDebt = (debtPlan?.total_debt as number) ?? (profile?.major_debts ?? []).reduce((s, d) => s + d.amount, 0);
  const netWorth = (diag?.net_worth as number) ?? totalAssets - totalDebt;

  const parsedDebts = debtOrder.map(parseDebtFromPlan).filter((d) => d.amount > 0);

  const groupedAssets = CATEGORIES.reduce<Record<AssetCategory, FixedAsset[]>>((acc, cat) => {
    acc[cat] = fixedAssets.filter((a) => a.category === cat);
    return acc;
  }, {} as Record<AssetCategory, FixedAsset[]>);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">Assets & Liabilities</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">Assets & Liabilities</h1>
        <Link
          href="/onboarding/holdings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors"
        >
          Edit Holdings
        </Link>
      </div>

      <div className="space-y-8">
        {/* NET WORTH HERO BANNER */}
        <div className="rounded-xl bg-[#0f1923] p-6 md:p-8 shadow-lg">
          <div className="flex flex-col gap-6">
            {/* Top row: Net Worth headline + metric cards */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="shrink-0">
                <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/60 mb-1">Net Worth</p>
                <p className="font-[family-name:var(--font-display)] text-[36px] md:text-[42px] font-bold tabular-nums text-white leading-none">
                  {fmt(netWorth)}
                </p>
                <div className="mt-2 h-[3px] w-24 rounded-full bg-gradient-to-r from-[#c9aa71] to-[#c9aa71]/0" />
              </div>
              <div className="hidden md:block w-px h-16 bg-white/10" />
              <div className="flex-1 grid grid-cols-3 gap-3 w-full">
                <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-4">
                  <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/60 mb-1">Investments & Liquid Assets</p>
                  <p className="font-[family-name:var(--font-display)] text-[22px] font-bold tabular-nums text-[#10b981]">{fmt(investmentTotal)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-4">
                  <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/60 mb-1">Fixed Assets</p>
                  <p className="font-[family-name:var(--font-display)] text-[22px] font-bold tabular-nums text-[#818cf8]">{fmt(fixedTotal)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-4">
                  <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/60 mb-1">Total Liabilities</p>
                  <p className="font-[family-name:var(--font-display)] text-[22px] font-bold tabular-nums text-[#ef4444]">{fmt(totalDebt)}</p>
                </div>
              </div>
            </div>

            {/* Asset composition bar */}
            {(() => {
              const barTotal = totalAssets + totalDebt;
              if (barTotal <= 0) return null;
              const invPct = Math.round((investmentTotal / barTotal) * 100);
              const fixPct = Math.round((fixedTotal / barTotal) * 100);
              const debtPct = Math.round((totalDebt / barTotal) * 100);
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-widest text-white/50">Asset & Debt Composition</p>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-white/50">
                      Total Assets: {fmt(totalAssets)}
                    </p>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
                    {investmentTotal > 0 && (
                      <div
                        className="h-full bg-[#10b981] transition-all duration-700"
                        style={{ width: `${(investmentTotal / barTotal) * 100}%` }}
                        title={`Investments & Liquid: ${fmt(investmentTotal)}`}
                      />
                    )}
                    {fixedTotal > 0 && (
                      <div
                        className="h-full bg-[#818cf8] transition-all duration-700"
                        style={{ width: `${(fixedTotal / barTotal) * 100}%` }}
                        title={`Fixed Assets: ${fmt(fixedTotal)}`}
                      />
                    )}
                    {totalDebt > 0 && (
                      <div
                        className="h-full bg-[#ef4444] transition-all duration-700"
                        style={{ width: `${(totalDebt / barTotal) * 100}%` }}
                        title={`Liabilities: ${fmt(totalDebt)}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                      <span className="font-[family-name:var(--font-body)] text-[11px] text-white/50">Investments ({invPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" />
                      <span className="font-[family-name:var(--font-body)] text-[11px] text-white/50">Fixed ({fixPct}%)</span>
                    </div>
                    {totalDebt > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                        <span className="font-[family-name:var(--font-body)] text-[11px] text-white/50">Debt ({debtPct}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ALLOCATION CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurrentAllocationChart />
          <AssetAllocationChart />
        </div>

        {/* ACCOUNT SUMMARY */}
        <div>
          <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-[var(--emerald)]" />
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">Account Summary</h3>
            </div>
            {holdings.length === 0 ? (
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
                No investment accounts on file.{" "}
                <Link href="/onboarding/holdings" className="text-[var(--emerald)] hover:underline">Add accounts</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {holdings.map((account) => (
                  <div key={account.id} className="flex items-center justify-between py-2 border-b border-[var(--warm-50)] last:border-0">
                    <div className="flex items-center gap-2">
                      <Landmark className="size-3.5 text-[var(--text-muted)]" />
                      <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">{ACCOUNT_LABELS[account.account_type] ?? account.account_type}</span>
                    </div>
                    <span className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--text-primary)]">{fmtFull(account.total_value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">Total</span>
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--emerald)]">{fmtFull(investmentTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INVESTMENT ACCOUNTS DETAIL */}
        {holdings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[var(--emerald)]" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">Investment Accounts</h2>
            </div>
            <div className="space-y-3">
              {holdings.map((account) => <AccountCard key={account.id} account={account} />)}
            </div>
          </div>
        )}

        {/* FIXED ASSETS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-[var(--emerald)]" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">Fixed Assets</h2>
              {fixedTotal > 0 && (
                <span className="ml-2 font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--emerald)]">
                  {fmtFull(fixedTotal)}
                </span>
              )}
            </div>
            {!showForm && !editingAsset && (
              <button
                onClick={() => { setShowForm(true); setEditingAsset(null); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--emerald)] text-white font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Asset
              </button>
            )}
          </div>

          {(showForm || editingAsset) && (
            <div className="mb-6">
              <FixedAssetForm
                initial={editingAsset ? assetToForm(editingAsset) : EMPTY_FORM}
                onSave={handleSaveAsset}
                onCancel={() => { setShowForm(false); setEditingAsset(null); }}
                saving={saving}
              />
            </div>
          )}

          {fixedAssets.length === 0 && !showForm ? (
            <div className="bg-white border border-dashed border-[var(--warm-200)] rounded-lg p-8 text-center">
              <Home className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mb-3">
                No fixed assets on file. Add your property, vehicles, or other assets.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Asset
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((cat) => {
                const assets = groupedAssets[cat];
                if (assets.length === 0) return null;
                const cfg = CATEGORY_CONFIG[cat];
                const CatIcon = cfg.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className="w-4 h-4 text-[var(--text-muted)]" />
                      <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                        {cfg.label}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assets.map((asset) => (
                        <FixedAssetCard
                          key={asset.id}
                          asset={asset}
                          onEdit={() => { setEditingAsset(asset); setShowForm(false); }}
                          onDelete={() => handleDeleteAsset(asset.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DEBTS & LIABILITIES */}
        {(parsedDebts.length > 0 || (profile?.major_debts ?? []).length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">Debts & Liabilities</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DebtBreakdownChart />
              <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--warm-200)]">
                      <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Debt</th>
                      <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">Balance</th>
                      <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedDebts.map((d) => (
                      <tr key={d.name} className="border-b border-[var(--warm-50)] last:border-0">
                        <td className="py-2.5 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">{d.name}</td>
                        <td className="py-2.5 text-right font-[family-name:var(--font-body)] text-sm font-medium tabular-nums text-[var(--text-primary)]">{fmtFull(d.amount)}</td>
                        <td className="py-2.5 text-right">
                          {d.rate && (
                            <span className={cn("font-[family-name:var(--font-body)] text-xs font-medium px-2 py-0.5 rounded-full", parseFloat(d.rate) >= 10 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
                              {d.rate}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {parsedDebts.length === 0 && (profile?.major_debts ?? []).map((d, i) => (
                      <tr key={i} className="border-b border-[var(--warm-50)] last:border-0">
                        <td className="py-2.5 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">{d.type}</td>
                        <td className="py-2.5 text-right font-[family-name:var(--font-body)] text-sm font-medium tabular-nums text-[var(--text-primary)]">{fmtFull(d.amount)}</td>
                        <td className="py-2.5 text-right">
                          {d.rate != null && <span className="font-[family-name:var(--font-body)] text-xs font-medium text-amber-600">{d.rate}%</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--warm-200)]">
                      <td className="pt-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">Total</td>
                      <td className="pt-3 text-right font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-red-600">{fmtFull(totalDebt)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                {avalanche?.payoff_months != null && (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <p className="font-[family-name:var(--font-body)] text-sm text-[var(--emerald-dark)]">
                      <span className="font-semibold">Payoff timeline:</span> {String(avalanche.payoff_months)} months using the {String(debtPlan?.recommended_method ?? "Avalanche")} method
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CASH FLOW */}
        {(profile || diag) && (() => {
          const annualIncome = profile?.annual_income ?? householdIncome ?? null;
          const monthlyExpenses = profile?.monthly_expenses ?? null;
          const monthlySavings = profile?.monthly_savings ?? null;
          const cashFlowMonthly = (diag?.cash_flow_monthly as number) ?? null;
          const savingsRate = (diag?.savings_rate_percent as number) ?? null;
          const efMonths = profile?.emergency_fund_months ?? (diag?.emergency_fund_months as number) ?? null;

          return (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[var(--emerald)]" />
                <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">Cash Flow Overview</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FinancialCard label="ANNUAL INCOME" value={fmt(annualIncome)} className="bg-gradient-to-br from-white to-emerald-50/40" />
                <FinancialCard label="MONTHLY CASH FLOW" value={fmt(cashFlowMonthly ?? (monthlySavings != null && monthlyExpenses != null ? monthlySavings : null))} className="bg-gradient-to-br from-white to-blue-50/40" />
                <FinancialCard
                  label="SAVINGS RATE"
                  value={savingsRate != null ? `${savingsRate}%` : (monthlyExpenses != null ? fmt(monthlyExpenses) : "--")}
                  unit={savingsRate != null ? undefined : (monthlyExpenses != null ? "/mo expenses" : undefined)}
                  className="bg-gradient-to-br from-white to-indigo-50/40"
                />
                <div className="rounded-lg border border-[var(--warm-200)] p-6 bg-gradient-to-br from-white to-amber-50/40">
                  <p className="font-body text-[13px] font-normal uppercase tracking-wider text-[var(--text-muted)]">EMERGENCY FUND</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-body text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">{efMonths != null ? Number(efMonths).toFixed(1) : "--"}</span>
                    <span className="font-body text-sm text-[var(--text-muted)]">months</span>
                  </div>
                  <div className="mt-3">
                    <div className="w-full h-2 bg-[var(--warm-100)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(((efMonths ?? 0) / 6) * 100, 100)}%`,
                          background: (efMonths ?? 0) >= 6 ? "var(--emerald)" : (efMonths ?? 0) >= 3 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <p className="font-body text-[11px] text-[var(--text-muted)] mt-1">Target: 6 months</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* FINANCIAL GOALS */}
        {profile?.financial_goals && profile.financial_goals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PiggyBank className="w-5 h-5 text-[var(--emerald)]" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">Financial Goals</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.financial_goals.map((g, i) => (
                <div key={i} className="bg-white border border-[var(--warm-200)] rounded-lg p-5 hover:shadow-sm transition-shadow">
                  <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-2">{g.goal}</p>
                  <div className="flex items-center gap-4">
                    {g.target_amount != null && (
                      <div>
                        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">Target</p>
                        <p className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--text-primary)]">{fmt(g.target_amount)}</p>
                      </div>
                    )}
                    {g.target_year != null && (
                      <div>
                        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">By</p>
                        <p className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)]">{g.target_year}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
