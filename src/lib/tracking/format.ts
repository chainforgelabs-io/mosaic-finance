/** Minus sits before the dollar sign: -$410, not $-410. */
export function withDollarSign(n: number, absFormatted: string): string {
  return n < 0 ? `-$${absFormatted}` : `$${absFormatted}`;
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return withDollarSign(n, abs);
}

export function formatMoneyExact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return withDollarSign(n, abs);
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return withDollarSign(n, `${(abs / 1_000_000).toFixed(1)}M`);
  if (abs >= 1_000) return withDollarSign(n, `${(abs / 1_000).toFixed(0)}K`);
  return withDollarSign(n, Math.round(abs).toLocaleString("en-CA"));
}
