import { describe, expect, it } from "vitest";
import {
  computeScores,
  momentumScore,
  buzzScore,
  sentimentScore,
  congressScore,
  priceActionScore,
  personaScore,
  fanoutWeight,
  ROUNDUP_TICKER_LIMIT,
  WEIGHTS,
} from "@/lib/signals/scoring";
import type { ScoreInputs } from "@/types/picks";

const ZERO_INPUTS: ScoreInputs = {
  trackedMentions24h: 0,
  trackedWeightSum24h: 0,
  firehoseMentions24h: 0,
  firehoseBaseline7dAvg: 0,
  avgSentiment24h: null,
  congressBuys30d: 0,
  congressSells30d: 0,
  changePct1d: null,
  volumeRatio: null,
  newsMentions24h: 0,
  personaBullishCount: 0,
  personaBearishCount: 0,
};

describe("weights", () => {
  it("sum to 1", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("sub-scores", () => {
  it("momentum grows with mentions and weight", () => {
    expect(momentumScore(0, 0)).toBe(0);
    expect(momentumScore(3, 2.4)).toBeGreaterThan(momentumScore(1, 0.7));
    expect(momentumScore(50, 40)).toBeLessThanOrEqual(100);
  });

  it("buzz handles zero baseline (new appearance)", () => {
    expect(buzzScore(0, 0)).toBe(0);
    expect(buzzScore(8, 0)).toBeGreaterThan(0);
  });

  it("buzz rewards spikes over baseline", () => {
    const spike = buzzScore(30, 5);
    const flat = buzzScore(5, 5);
    expect(spike).toBeGreaterThan(flat);
  });

  it("sentiment is neutral at 50 when null or zero", () => {
    expect(sentimentScore(null)).toBe(50);
    expect(sentimentScore(0)).toBe(50);
    expect(sentimentScore(1)).toBe(100);
    expect(sentimentScore(-1)).toBe(0);
  });

  it("congress net buys raise score, net sells lower it", () => {
    expect(congressScore(3, 0)).toBeGreaterThan(50);
    expect(congressScore(0, 3)).toBeLessThan(50);
    expect(congressScore(0, 0)).toBe(50);
    expect(congressScore(2, 2)).toBe(55); // activity without direction
  });

  it("price action is direction-agnostic", () => {
    const up = priceActionScore(8, null);
    const down = priceActionScore(-8, null);
    expect(up).toBe(down);
    expect(up).toBeGreaterThan(0);
  });

  it("persona consensus maps to 0-100", () => {
    expect(personaScore(0, 0)).toBe(50);
    expect(personaScore(4, 0)).toBe(100);
    expect(personaScore(0, 4)).toBe(0);
    expect(personaScore(2, 2)).toBe(50);
  });
});

describe("fanoutWeight", () => {
  it("focused single-ticker post gets full weight", () => {
    expect(fanoutWeight(1)).toBe(1);
  });

  it("multi-ticker post splits weight evenly", () => {
    expect(fanoutWeight(4)).toBe(0.25);
    expect(fanoutWeight(12)).toBeCloseTo(1 / 12);
  });

  it("roundup cutoff zeroes posts above the limit", () => {
    expect(
      fanoutWeight(ROUNDUP_TICKER_LIMIT, { roundupCutoff: true }),
    ).toBeCloseTo(1 / ROUNDUP_TICKER_LIMIT);
    expect(
      fanoutWeight(ROUNDUP_TICKER_LIMIT + 1, { roundupCutoff: true }),
    ).toBe(0);
    expect(fanoutWeight(12, { roundupCutoff: true })).toBe(0);
  });

  it("handles zero and negative counts", () => {
    expect(fanoutWeight(0)).toBe(0);
    expect(fanoutWeight(-3)).toBe(0);
  });
});

describe("computeScores", () => {
  it("neutral baseline lands mid-range from sentiment/congress/persona neutrality", () => {
    const result = computeScores(ZERO_INPUTS);
    // 50 * (0.15 + 0.15 + 0.05) = 17.5
    expect(result.compositeScore).toBeCloseTo(17.5, 1);
    expect(result.underTheRadar).toBe(false);
    expect(result.bigMover).toBe(false);
  });

  it("flags big movers on price change", () => {
    const result = computeScores({ ...ZERO_INPUTS, changePct1d: 7.2 });
    expect(result.bigMover).toBe(true);
  });

  it("flags big movers on volume ratio", () => {
    const result = computeScores({ ...ZERO_INPUTS, volumeRatio: 4 });
    expect(result.bigMover).toBe(true);
  });

  it("flags under-the-radar for high score + low firehose buzz", () => {
    const result = computeScores({
      ...ZERO_INPUTS,
      trackedMentions24h: 12,
      trackedWeightSum24h: 9,
      avgSentiment24h: 0.8,
      congressBuys30d: 4,
      changePct1d: 4,
      volumeRatio: 2,
      newsMentions24h: 6,
      personaBullishCount: 3,
      firehoseMentions24h: 2,
    });
    expect(result.compositeScore).toBeGreaterThan(60);
    expect(result.underTheRadar).toBe(true);
  });

  it("does not flag under-the-radar when firehose buzz is high", () => {
    const result = computeScores({
      ...ZERO_INPUTS,
      trackedMentions24h: 12,
      trackedWeightSum24h: 9,
      avgSentiment24h: 0.8,
      congressBuys30d: 4,
      changePct1d: 4,
      volumeRatio: 2,
      newsMentions24h: 6,
      personaBullishCount: 3,
      firehoseMentions24h: 50,
      firehoseBaseline7dAvg: 10,
    });
    expect(result.underTheRadar).toBe(false);
  });
});
