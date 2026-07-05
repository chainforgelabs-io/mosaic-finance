/**
 * Era separators for the research dataset. Snapshots stamped with these
 * values; rows from different versions must never be pooled in analysis.
 *
 * PROCESS CONSTRAINT: do not retune scoring WEIGHTS or ingest prompts
 * casually while collection runs. Every change bumps the corresponding
 * version here and fragments the dataset into non-poolable eras — batch
 * such changes deliberately.
 */

/** Bump on ANY change to WEIGHTS or flag thresholds in scoring.ts. */
export const SCORING_CONFIG_VERSION = 1;

/**
 * xAI model used for tracked/firehose extraction. xAI publishes dated
 * immutable snapshots only for some model lines; the search-enabled
 * flagship currently has no dated snapshot, so this is a stable alias
 * with residual drift risk (see docs/export-api.md). If the alias is
 * observed to change behavior, bump EXTRACTION_PROMPT_VERSION.
 *
 * History:
 * - pre-2026-07-04: code requested "grok-3-fast-latest", which xAI retired
 *   on 2026-05-15 and silently redirected to grok-4.3. Snapshots do not
 *   exist for that era (snapshot collection started 2026-07-04).
 */
export const EXTRACTION_MODEL = "grok-4.3";
export const EXTRACTION_MODEL_FIRST_SEEN = "2026-07-04";

/** Bump on ANY change to the ingest prompts in ingest-tracked/ingest-firehose. */
export const EXTRACTION_PROMPT_VERSION = "ingest-v1";
