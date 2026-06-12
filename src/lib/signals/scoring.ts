import type { ScoreInputs, ScoreResult } from "@/types/picks";

/**
 * Composite scoring for ticker signals. All sub-scores normalize to 0-100,
 * then combine via WEIGHTS. Pure functions — recomputable from raw_signals
 * at any time if weights change.
 */

export const WEIGHTS = {
  momentum: 0.25, // tracked-account mentions (quality-weighted)
  buzz: 0.15, // firehose mention delta vs baseline
  sentiment: 0.15,
  congress: 0.15,
  priceAction: 0.15,
  news: 0.1,
  persona: 0.05,
} as const;

/** Mentions below this firehose count qualify as "under the radar". */
export const RADAR_FIREHOSE_THRESHOLD = 10;
export const RADAR_SCORE_THRESHOLD = 60;
export const BIG_MOVER_CHANGE_PCT = 5;
export const BIG_MOVER_VOLUME_RATIO = 3;

/**
 * Posts naming more than this many tickers are "roundups" (premarket movers
 * lists, index recaps) and carry no per-ticker alpha signal.
 */
export const ROUNDUP_TICKER_LIMIT = 6;

/**
 * Dampening for multi-ticker posts: a post naming N tickers contributes 1/N
 * per ticker, so a focused single-name call outweighs a 12-name roundup.
 * With `roundupCutoff`, posts above ROUNDUP_TICKER_LIMIT contribute nothing
 * (used for the alpha-momentum component).
 */
export function fanoutWeight(
  tickerCount: number,
  options?: { roundupCutoff?: boolean },
): number {
  if (tickerCount <= 0) return 0;
  if (options?.roundupCutoff && tickerCount > ROUNDUP_TICKER_LIMIT) return 0;
  return 1 / tickerCount;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Saturating curve: hits ~63 at `scale`, asymptotes to 100. */
function saturate(value: number, scale: number): number {
  if (value <= 0 || scale <= 0) return 0;
  return clamp(100 * (1 - Math.exp(-value / scale)));
}

/** Quality-weighted tracked-account momentum. */
export function momentumScore(
  trackedMentions24h: number,
  trackedWeightSum24h: number,
): number {
  // Weight sum rewards high-quality accounts; raw count rewards breadth.
  return clamp(
    0.6 * saturate(trackedWeightSum24h, 3) + 0.4 * saturate(trackedMentions24h, 5),
  );
}

/** Firehose buzz relative to the ticker's own 7-day baseline. */
export function buzzScore(
  firehoseMentions24h: number,
  firehoseBaseline7dAvg: number,
): number {
  if (firehoseMentions24h <= 0) return 0;
  if (firehoseBaseline7dAvg <= 0) {
    // New appearance — moderately interesting on volume alone
    return saturate(firehoseMentions24h, 8);
  }
  const ratio = firehoseMentions24h / firehoseBaseline7dAvg;
  // ratio 1 -> ~40, ratio 3 -> ~80, ratio 5+ -> ~95
  return clamp(40 + saturate(ratio - 1, 2) * 0.6);
}

/** avg sentiment in [-1, 1] mapped to 0-100 (neutral = 50). */
export function sentimentScore(avgSentiment24h: number | null): number {
  if (avgSentiment24h === null) return 50;
  return clamp(50 + avgSentiment24h * 50);
}

/** Net congress buys, 0-100 (neutral = 50). */
export function congressScore(buys30d: number, sells30d: number): number {
  const net = buys30d - sells30d;
  if (net === 0) return buys30d > 0 ? 55 : 50; // activity itself is mildly notable
  const magnitude = saturate(Math.abs(net), 3) / 2; // 0-50
  return clamp(50 + Math.sign(net) * magnitude);
}

/** Absolute price/volume action — direction-agnostic (movers cut both ways). */
export function priceActionScore(
  changePct1d: number | null,
  volumeRatio: number | null,
): number {
  const changeComponent =
    changePct1d === null ? 0 : saturate(Math.abs(changePct1d), 5);
  const volumeComponent =
    volumeRatio === null || volumeRatio <= 1
      ? 0
      : saturate(volumeRatio - 1, 2);
  return clamp(0.65 * changeComponent + 0.35 * volumeComponent);
}

export function newsScore(newsMentions24h: number): number {
  return saturate(newsMentions24h, 4);
}

export function personaScore(bullish: number, bearish: number): number {
  const total = bullish + bearish;
  if (total === 0) return 50;
  return clamp(50 + ((bullish - bearish) / total) * 50);
}

export function computeScores(inputs: ScoreInputs): ScoreResult {
  const momentum = momentumScore(
    inputs.trackedMentions24h,
    inputs.trackedWeightSum24h,
  );
  const buzz = buzzScore(
    inputs.firehoseMentions24h,
    inputs.firehoseBaseline7dAvg,
  );
  const sentiment = sentimentScore(inputs.avgSentiment24h);
  const congress = congressScore(
    inputs.congressBuys30d,
    inputs.congressSells30d,
  );
  const priceAction = priceActionScore(inputs.changePct1d, inputs.volumeRatio);
  const news = newsScore(inputs.newsMentions24h);
  const persona = personaScore(
    inputs.personaBullishCount,
    inputs.personaBearishCount,
  );

  const composite =
    momentum * WEIGHTS.momentum +
    buzz * WEIGHTS.buzz +
    sentiment * WEIGHTS.sentiment +
    congress * WEIGHTS.congress +
    priceAction * WEIGHTS.priceAction +
    news * WEIGHTS.news +
    persona * WEIGHTS.persona;

  const bigMover =
    (inputs.changePct1d !== null &&
      Math.abs(inputs.changePct1d) > BIG_MOVER_CHANGE_PCT) ||
    (inputs.volumeRatio !== null &&
      inputs.volumeRatio > BIG_MOVER_VOLUME_RATIO);

  const underTheRadar =
    composite > RADAR_SCORE_THRESHOLD &&
    inputs.firehoseMentions24h < RADAR_FIREHOSE_THRESHOLD;

  return {
    momentumScore: round1(momentum),
    buzzScore: round1(buzz),
    sentimentScore: round1(sentiment),
    congressScore: round1(congress),
    priceActionScore: round1(priceAction),
    newsScore: round1(news),
    personaScore: round1(persona),
    compositeScore: round1(composite),
    underTheRadar,
    bigMover,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
