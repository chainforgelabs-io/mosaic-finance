export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatMoneyExact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
