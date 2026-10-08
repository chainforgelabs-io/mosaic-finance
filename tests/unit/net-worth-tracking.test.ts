import { describe, expect, it } from "vitest";
import {
  availableCreditFor,
  classifyLiability,
  enrichBreakdown,
  groupComparison,
  lineSeries,
  liquidity,
  monthsSinceLastSnapshot,
  netWorthComparison,
  snapshotForMonth,
  snapshotGroups,
  snapshotMonths,
} from "@/lib/net-worth/tracking";
import type { NetWorthSnapshotRow, SnapshotBreakdown } from "@/types/tracking";

function snap(date: string, breakdown: SnapshotBreakdown, overrides: Partial<NetWorthSnapshotRow> = {}): NetWorthSnapshotRow {
  const investments_total = breakdown.investments.reduce((s, i) => s + i.value, 0);
  const fixed_assets_total = breakdown.fixed_assets.reduce((s, i) => s + i.value, 0);
  const debts_total = breakdown.debts.reduce((s, i) => s + i.value, 0);
  return {
    id: date,
    user_id: "u",
    snapshot_date: date,
    investments_total,
    fixed_assets_total,
    debts_total,
    net_worth: investments_total + fixed_assets_total - debts_total,
    breakdown,
    created_at: date,
    updated_at: date,
    ...overrides,
  };
}

const march = snap("2026-03-14", {
  investments: [
    { id: "tfsa", account_type: "TFSA", value: 42000 },
    { id: "bank", account_type: "Bank-Account", value: 6500 },
  ],
  fixed_assets: [{ id: "home", name: "Home", category: "real_estate", value: 650000 }],
  debts: [
    { type: "Mortgage", value: 410000 },
    { type: "Visa credit card", value: 1800, credit_limit: 10000 },
    { type: "Line of credit", value: 0, credit_limit: 25000 },
  ],
});

const february = snap("2026-02-10", {
  investments: [
    { id: "tfsa", account_type: "TFSA", value: 40000 },
    { id: "bank", account_type: "Bank-Account", value: 5000 },
  ],
  fixed_assets: [{ id: "home", name: "Home", category: "real_estate", value: 650000 }],
  debts: [
    { type: "Mortgage", value: 411000 },
    { type: "Visa credit card", value: 2600, credit_limit: 10000 },
    { type: "Line of credit", value: 1000, credit_limit: 25000 },
  ],
});

const lastMarch = snap("2025-03-20", {
  investments: [{ id: "tfsa", account_type: "TFSA", value: 30000 }],
  fixed_assets: [{ id: "home", name: "Home", category: "real_estate", value: 600000 }],
  debts: [{ type: "Mortgage", value: 420000 }],
});

const all = [march, lastMarch, february];

describe("classifyLiability", () => {
  it("treats revolving credit as short-term", () => {
    expect(classifyLiability("Visa credit card")).toBe("short");
    expect(classifyLiability("Line of Credit")).toBe("short");
    expect(classifyLiability("HELOC")).toBe("short");
    expect(classifyLiability("Amex")).toBe("short");
    expect(classifyLiability("Overdraft")).toBe("short");
  });

  it("treats loans and mortgages as long-term", () => {
    expect(classifyLiability("Mortgage")).toBe("long");
    expect(classifyLiability("Car loan")).toBe("long");
    expect(classifyLiability("Student loan")).toBe("long");
    expect(classifyLiability("")).toBe("long");
    expect(classifyLiability(undefined)).toBe("long");
  });

  it("does not match 'loc' inside other words", () => {
    expect(classifyLiability("Relocation loan")).toBe("long");
  });
});

describe("availableCreditFor", () => {
  it("is limit minus balance, floored at zero", () => {
    expect(availableCreditFor({ value: 1800, credit_limit: 10000 })).toBe(8200);
    expect(availableCreditFor({ value: 12000, credit_limit: 10000 })).toBe(0);
    expect(availableCreditFor({ value: 500 })).toBe(0);
    expect(availableCreditFor({ value: 500, credit_limit: null })).toBe(0);
  });
});

describe("snapshotGroups", () => {
  it("splits a snapshot into the five groups from item lists", () => {
    const groups = snapshotGroups(march);
    expect(groups.liquid).toBe(48500);
    expect(groups.fixed).toBe(650000);
    expect(groups.shortTerm).toBe(1800);
    expect(groups.longTerm).toBe(410000);
    expect(groups.availableCredit).toBe(8200 + 25000);
    expect(groups.cash).toBe(6500);
    expect(groups.assets).toBe(698500);
    expect(groups.liabilities).toBe(411800);
    expect(groups.netWorth).toBe(286700);
  });

  it("prefers stored totals when the breakdown was enriched", () => {
    const enriched = { ...march, breakdown: enrichBreakdown(march.breakdown) };
    const groups = snapshotGroups(enriched);
    expect(groups.shortTerm).toBe(1800);
    expect(groups.longTerm).toBe(410000);
    expect(groups.availableCredit).toBe(33200);
    expect(groups.cash).toBe(6500);
  });

  it("falls back to debts_total when a legacy snapshot has no debt items", () => {
    const legacy = snap("2025-01-05", { investments: [], fixed_assets: [], debts: [] }, { debts_total: 5000, investments_total: 20000, net_worth: 15000 });
    const groups = snapshotGroups(legacy);
    expect(groups.longTerm).toBe(5000);
    expect(groups.shortTerm).toBe(0);
    expect(groups.liabilities).toBe(5000);
    expect(groups.netWorth).toBe(15000);
  });
});

describe("liquidity and enrichBreakdown", () => {
  it("adds cash and available credit", () => {
    expect(liquidity(snapshotGroups(march))).toBe(6500 + 33200);
  });

  it("writes derived totals into the breakdown without touching the lists", () => {
    const enriched = enrichBreakdown(march.breakdown);
    expect(enriched.short_term_total).toBe(1800);
    expect(enriched.long_term_total).toBe(410000);
    expect(enriched.available_credit).toBe(33200);
    expect(enriched.cash_total).toBe(6500);
    expect(enriched.liquidity).toBe(39700);
    expect(enriched.debts).toBe(march.breakdown.debts);
  });
});

describe("snapshotForMonth", () => {
  it("returns the exact month when present, else the latest before it", () => {
    expect(snapshotForMonth(all, "2026-03")?.snapshot_date).toBe("2026-03-14");
    expect(snapshotForMonth(all, "2026-01")?.snapshot_date).toBe("2025-03-20");
    expect(snapshotForMonth(all, "2024-12")).toBeNull();
  });
});

describe("netWorthComparison", () => {
  it("compares against the prior snapshot and the one a year earlier", () => {
    const c = netWorthComparison(all, "2026-03");
    expect(c.current?.snapshot_date).toBe("2026-03-14");
    expect(c.previousMonth?.snapshot_date).toBe("2026-02-10");
    expect(c.previousYear?.snapshot_date).toBe("2025-03-20");
    expect(c.netWorth).toBe(286700);
    // February net worth: 45000 + 650000 - 414600 = 280400
    expect(c.sinceLastMonth.amount).toBe(6300);
    expect(c.sinceLastMonth.pct).toBeCloseTo(6300 / 280400, 4);
    // Last March: 30000 + 600000 - 420000 = 210000
    expect(c.sinceLastYear.amount).toBe(76700);
    expect(c.sinceLastYear.pct).toBeCloseTo(76700 / 210000, 4);
  });

  it("returns nulls when nothing exists yet", () => {
    const c = netWorthComparison([], "2026-03");
    expect(c.current).toBeNull();
    expect(c.netWorth).toBeNull();
    expect(c.sinceLastMonth).toEqual({ amount: null, pct: null });
  });

  it("has no year-over-year when the history is shorter than a year", () => {
    const c = netWorthComparison([march, february], "2026-03");
    expect(c.previousMonth?.snapshot_date).toBe("2026-02-10");
    expect(c.previousYear).toBeNull();
    expect(c.sinceLastYear.amount).toBeNull();
  });

  it("uses an older snapshot as the year-ago point when the exact month is missing", () => {
    const older = snap("2025-01-15", { investments: [{ id: "tfsa", account_type: "TFSA", value: 10000 }], fixed_assets: [], debts: [] });
    const c = netWorthComparison([march, older], "2026-03");
    expect(c.previousYear?.snapshot_date).toBe("2025-01-15");
  });

  it("reports a null percentage when the previous value was zero", () => {
    const zero = snap("2026-02-01", { investments: [], fixed_assets: [], debts: [] });
    const c = netWorthComparison([march, zero], "2026-03");
    expect(c.sinceLastMonth.amount).toBe(286700);
    expect(c.sinceLastMonth.pct).toBeNull();
  });
});

describe("lineSeries", () => {
  it("emits assets, liabilities and net worth oldest first", () => {
    const series = lineSeries(all);
    expect(series.map((p) => p.date)).toEqual(["2025-03-20", "2026-02-10", "2026-03-14"]);
    expect(series[2]).toMatchObject({ assets: 698500, liabilities: 411800, netWorth: 286700 });
    expect(series[0].label).toMatch(/Mar/);
  });
});

describe("groupComparison", () => {
  it("matches items across snapshots and signs the diffs", () => {
    const result = groupComparison(march, february);
    const liquid = result.groups.find((g) => g.group === "liquid")!;
    const tfsa = liquid.items.find((i) => i.key === "tfsa")!;
    expect(tfsa).toMatchObject({ current: 42000, previous: 40000, diff: 2000, invert: false });
    expect(tfsa.diffPct).toBeCloseTo(0.05, 4);
    expect(liquid.total).toMatchObject({ current: 48500, previous: 45000, diff: 3500 });

    const shortTerm = result.groups.find((g) => g.group === "shortTerm")!;
    const visa = shortTerm.items.find((i) => i.key === "Visa credit card")!;
    expect(visa).toMatchObject({ current: 1800, previous: 2600, diff: -800, invert: true });
    expect(shortTerm.total).toMatchObject({ current: 1800, previous: 3600, diff: -1800 });

    const credit = result.groups.find((g) => g.group === "availableCredit")!;
    expect(credit.total).toMatchObject({ current: 33200, previous: 31400, diff: 1800 });

    expect(result.assets).toMatchObject({ current: 698500, previous: 695000, diff: 3500 });
    expect(result.liabilities).toMatchObject({ current: 411800, previous: 414600, diff: -2800, invert: true });
    expect(result.netWorth).toMatchObject({ current: 286700, previous: 280400, diff: 6300 });
  });

  it("keeps items that only exist on one side", () => {
    const result = groupComparison(march, lastMarch);
    const liquid = result.groups.find((g) => g.group === "liquid")!;
    const bank = liquid.items.find((i) => i.key === "bank")!;
    expect(bank).toMatchObject({ current: 6500, previous: null, diff: 6500, diffPct: null });
  });

  it("handles a missing previous snapshot", () => {
    const result = groupComparison(march, null);
    expect(result.netWorth).toMatchObject({ current: 286700, previous: null, diff: null, diffPct: null });
    const liquid = result.groups.find((g) => g.group === "liquid")!;
    expect(liquid.items).toHaveLength(2);
  });
});

describe("snapshotMonths and monthsSinceLastSnapshot", () => {
  it("lists distinct months newest first", () => {
    expect(snapshotMonths(all)).toEqual(["2026-03", "2026-02", "2025-03"]);
  });

  it("counts whole months since the latest snapshot", () => {
    expect(monthsSinceLastSnapshot(all, "2026-03-30")).toBe(0);
    expect(monthsSinceLastSnapshot(all, "2026-05-02")).toBe(2);
    expect(monthsSinceLastSnapshot([], "2026-05-02")).toBeNull();
  });
});
