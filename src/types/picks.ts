export type PicksMode = "light" | "heavy";

export type RawSignalSource =
  | "x_tracked"
  | "x_firehose"
  | "congress"
  | "news"
  | "price_action";

export type TrackedXAccountSource = "manual" | "twitter_oauth" | "seed";

/** DB row: public.tracked_x_accounts */
export interface TrackedXAccount {
  id: string;
  handle: string;
  display_name: string | null;
  category: string;
  weight: number;
  active: boolean;
  source_added_via: TrackedXAccountSource;
  added_at: string;
  last_ingested_at: string | null;
}

/** DB row: public.tracked_congress_members */
export interface TrackedCongressMember {
  id: string;
  full_name: string;
  chamber: string | null;
  party: string | null;
  track_record_score: number | null;
  source: string | null;
  active: boolean;
  added_at: string;
}

/** DB row: public.raw_signals (`content` = tweet/snippet body) */
export interface RawSignal {
  id: string;
  source: RawSignalSource;
  source_id: string;
  ticker: string;
  author_handle: string | null;
  content: string | null;
  url: string | null;
  sentiment: number | null;
  engagement: number | null;
  occurred_at: string;
  ingested_at: string;
}

/** DB row: public.ticker_signals */
export interface TickerSignal {
  ticker: string;
  name: string | null;
  sector: string | null;
  last_price: number | null;
  last_change_pct: number | null;
  mention_count_24h: number | null;
  mention_count_7d: number | null;
  tracked_account_mentions_24h: number | null;
  firehose_mentions_24h: number | null;
  congress_buys_30d: number | null;
  congress_sells_30d: number | null;
  avg_sentiment_24h: number | null;
  momentum_score: number | null;
  value_score: number | null;
  congress_score: number | null;
  composite_score: number | null;
  under_the_radar: boolean | null;
  big_mover: boolean | null;
  last_updated_at: string;
}

/** DB row: public.ticker_persona_takes */
export interface TickerPersonaTake {
  id: string;
  ticker: string;
  persona: string;
  outlook:
    | "very_bullish"
    | "bullish"
    | "neutral"
    | "bearish"
    | "very_bearish";
  summary: string;
  key_points: string[];
  generated_at: string;
  expires_at: string;
}

/** DB row: public.user_picks */
export interface UserPick {
  id: string;
  user_id: string;
  ticker: string;
  added_at: string;
  notes: string | null;
  alert_on_change: boolean;
}

/** DB row: public.picks_settings */
export interface PicksSettingsRow {
  user_id: string;
  mode: PicksMode;
  last_changed_at: string;
}

/** DB row: public.x_oauth_tokens (tokens never sent to client) */
export interface XOAuthConnection {
  x_user_id: string;
  x_username: string | null;
  connected_at: string;
}

export type PicksSubTab = "discover" | "mypicks" | "sources";

export type DiscoverFilter = "top" | "movers" | "radar";

/** Inputs to the composite score (already aggregated per ticker). */
export interface ScoreInputs {
  trackedMentions24h: number;
  trackedWeightSum24h: number;
  firehoseMentions24h: number;
  firehoseBaseline7dAvg: number;
  avgSentiment24h: number | null;
  congressBuys30d: number;
  congressSells30d: number;
  changePct1d: number | null;
  volumeRatio: number | null;
  newsMentions24h: number;
  personaBullishCount: number;
  personaBearishCount: number;
}

export interface ScoreResult {
  momentumScore: number;
  buzzScore: number;
  sentimentScore: number;
  congressScore: number;
  priceActionScore: number;
  newsScore: number;
  personaScore: number;
  compositeScore: number;
  underTheRadar: boolean;
  bigMover: boolean;
}

/** Enriched user pick returned by /api/picks/my */
export interface EnrichedPick extends UserPick {
  signal: TickerSignal | null;
  takes: TickerPersonaTake[];
}

export interface ScanSummary {
  mode: PicksMode;
  trackedPostsIngested: number;
  firehosePostsIngested: number;
  newsSignalsIngested: number;
  tickersAggregated: number;
  snapshotsWritten: number;
  startedAt: string;
  finishedAt: string;
  errors: string[];
}
