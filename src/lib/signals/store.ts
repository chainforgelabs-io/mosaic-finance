import { createServiceClient } from "@/lib/supabase/service";
import type { RawSignalSource } from "@/types/picks";

export interface RawSignalInsert {
  source: RawSignalSource;
  source_id: string;
  ticker: string;
  author_handle?: string | null;
  content?: string | null;
  url?: string | null;
  sentiment?: number | null;
  engagement?: number | null;
  occurred_at: string;
}

const CHUNK_SIZE = 200;

/**
 * Idempotent insert into raw_signals — duplicate (source, source_id, ticker)
 * rows are silently skipped so ingestion jobs can safely re-scan windows.
 * Returns number of rows attempted (Supabase doesn't report skip counts).
 */
export async function insertRawSignals(
  rows: RawSignalInsert[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createServiceClient();
  let attempted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("raw_signals")
      .upsert(chunk, {
        onConflict: "source,source_id,ticker",
        ignoreDuplicates: true,
      });
    if (error) throw error;
    attempted += chunk.length;
  }

  return attempted;
}

/** Sentiment labels (from Grok) to numeric [-1, 1]. */
export function sentimentToNumber(
  label: string | null | undefined,
): number | null {
  switch ((label || "").toLowerCase()) {
    case "bullish":
      return 1;
    case "bearish":
      return -1;
    case "neutral":
      return 0;
    default:
      return null;
  }
}
