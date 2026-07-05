/**
 * Pure label math for the forward-return labeler. No I/O — everything here
 * is deterministic and unit-tested (splits, dividends, DST, holidays).
 *
 * Conventions (documented in docs/export-api.md):
 * - Entry: the open of the first trading day whose 09:30 America/New_York
 *   open is strictly after the scan timestamp ("next market open").
 * - Day 1 = entry day. forward_return(N) = close(day N) / open(day 1) - 1.
 *   MFE(N) = max(high, days 1..N) / open(day 1) - 1. MAE mirrors with lows.
 * - All prices are split- AND dividend-adjusted before any math, so labels
 *   are total-return based and corporate actions inside a window are inert.
 * - The trading calendar is the price series itself: dates with bars are
 *   trading days. No holiday tables to drift out of date.
 */

export const LABEL_HORIZONS = [1, 3, 5, 10, 20] as const;

/** Pre-registered excursion-touch thresholds, keyed by horizon. */
export const POP_THRESHOLDS: Record<number, number> = {
  3: 0.05, // +5% within 3 trading days
  5: 0.1, // +10% within 5
  10: 0.2, // +20% within 10
};

export interface DailyBar {
  /** Trading date, YYYY-MM-DD (exchange local). */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /**
   * Split+dividend adjusted close when the source provides one. When
   * absent the bar is assumed to already be fully adjusted.
   */
  adjClose?: number;
}

export interface AdjustedBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Fully adjust OHLC using the per-day adjClose/close factor. This is
 * correct regardless of what the raw series already carries: the factor
 * captures exactly the residual adjustment (splits and/or dividends)
 * between the raw bar and the fully-adjusted close.
 */
export function adjustBars(bars: DailyBar[]): AdjustedBar[] {
  return bars.map((b) => {
    const factor =
      b.adjClose !== undefined && b.close > 0 ? b.adjClose / b.close : 1;
    return {
      date: b.date,
      open: b.open * factor,
      high: b.high * factor,
      low: b.low * factor,
      close: b.close * factor,
    };
  });
}

/** Calendar date + minutes-since-midnight in America/New_York (DST-correct). */
export function easternParts(instant: Date): {
  date: string;
  minutes: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  // hour12:false can yield "24" for midnight in some ICU versions
  const hour = parseInt(parts.hour, 10) % 24;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + parseInt(parts.minute, 10),
  };
}

const MARKET_OPEN_MINUTES = 9 * 60 + 30;

/**
 * First trading date whose 09:30 ET open is strictly after the scan.
 * `tradingDates` must be ascending YYYY-MM-DD strings (the bar dates).
 * Returns null when the series doesn't yet extend past the scan.
 */
export function entryDateFor(
  scannedAt: Date,
  tradingDates: string[],
): string | null {
  const et = easternParts(scannedAt);
  // Scanned before the open (pre-market): that same ET date qualifies.
  const earliest =
    et.minutes < MARKET_OPEN_MINUTES ? et.date : nextCalendarDate(et.date);
  for (const d of tradingDates) {
    if (d >= earliest) return d;
  }
  return null;
}

function nextCalendarDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export interface HorizonLabel {
  horizonDays: number;
  entryDate: string;
  entryOpen: number;
  forwardReturn: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  popLabel: boolean | null;
  dumpLabel: boolean | null;
}

/**
 * Compute labels for every horizon whose window has fully closed, i.e.
 * bars exist for all N days. Windows still open (or cut short by
 * delisting) are simply not returned — the caller decides when missing
 * horizons become `insufficient_data`.
 */
export function computeHorizonLabels(
  entryDate: string,
  bars: AdjustedBar[],
): HorizonLabel[] {
  const entryIdx = bars.findIndex((b) => b.date === entryDate);
  if (entryIdx < 0) return [];
  const entryOpen = bars[entryIdx].open;
  if (!(entryOpen > 0)) return [];

  const labels: HorizonLabel[] = [];
  for (const horizon of LABEL_HORIZONS) {
    const windowEnd = entryIdx + horizon - 1;
    if (windowEnd >= bars.length) continue; // window not closed yet

    const window = bars.slice(entryIdx, windowEnd + 1);
    const maxHigh = Math.max(...window.map((b) => b.high));
    const minLow = Math.min(...window.map((b) => b.low));
    const mfe = maxHigh / entryOpen - 1;
    const mae = minLow / entryOpen - 1;
    const threshold = POP_THRESHOLDS[horizon];

    labels.push({
      horizonDays: horizon,
      entryDate,
      entryOpen,
      forwardReturn: bars[windowEnd].close / entryOpen - 1,
      maxFavorableExcursion: mfe,
      maxAdverseExcursion: mae,
      popLabel: threshold !== undefined ? mfe >= threshold : null,
      dumpLabel: threshold !== undefined ? mae <= -threshold : null,
    });
  }
  return labels;
}
