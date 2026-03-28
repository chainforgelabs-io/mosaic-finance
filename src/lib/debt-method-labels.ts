/** Human-readable labels for plan `recommended_method` values (often snake_case). */
export const DEBT_METHOD_LABELS: Record<string, string> = {
  avalanche: "Avalanche Method",
  snowball: "Snowball Method",
  modified_minimum_payment: "Modified Minimum Payment",
  debt_avalanche: "Debt Avalanche",
  debt_snowball: "Debt Snowball",
};

/**
 * Prefer mapped labels for short snake_case keys; preserve verbose "Label: description" strings.
 */
export function formatDebtRecommendedMethod(raw: string | null | undefined): string {
  if (raw == null || raw === "") return DEBT_METHOD_LABELS.avalanche;
  const colonIdx = raw.indexOf(":");
  const short = colonIdx > 0 ? raw.slice(0, colonIdx).trim() : raw.split(/[.!,]/)[0].trim();
  const key = short.toLowerCase().replace(/\s+/g, "_");
  return DEBT_METHOD_LABELS[key] ?? DEBT_METHOD_LABELS[short.toLowerCase()] ?? short;
}
