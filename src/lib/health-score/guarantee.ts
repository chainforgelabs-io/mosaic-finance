export interface ScoreHistoryRow {
  score: number;
  source?: string | null;
  recorded_at: string;
}

/**
 * The Consistency Guarantee compares the live (derived) Financial Health Score
 * against itself. Report-sourced scores use a different rubric, so mixing the
 * two produces a phantom drop the moment the first derived score lands.
 */
export function derivedScoreDelta(rows: ScoreHistoryRow[]): number | null {
  const derived = rows
    .filter((row) => (row.source ?? "derived") === "derived")
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  if (derived.length < 2) return null;
  return derived[derived.length - 1].score - derived[0].score;
}

export const GUARANTEE_WEEKS_REQUIRED = 13;
export const GUARANTEE_SNAPSHOTS_REQUIRED = 3;

export function guaranteeEligible(input: {
  weeksLogged: number;
  snapshots: number;
  scoreDelta: number | null;
}): boolean {
  return (
    input.weeksLogged >= GUARANTEE_WEEKS_REQUIRED &&
    input.snapshots >= GUARANTEE_SNAPSHOTS_REQUIRED &&
    input.scoreDelta != null &&
    input.scoreDelta <= 0
  );
}
