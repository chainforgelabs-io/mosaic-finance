/** Shown when a model reply stops before the page is finished. */
export const PAGE_CUTOFF_NOTE = "Part of a page was cut off, so some lines may be missing.";

const CUTOFF_PREFIXES = ["Part of a page was cut off", "The reply was cut off"];

/**
 * Keep a file-read failure and a cut-off page. Drop the reader's page-by-page
 * commentary about terms, summaries, card payments, refunds, and currency.
 */
export function publishReaderNotes(notes: string[]): string {
  const kept: string[] = [];
  let cutoff = false;
  for (const raw of notes) {
    for (const part of raw.split(/(?<=[.!?])\s+/)) {
      const sentence = part.trim();
      if (!sentence) continue;
      if (sentence.startsWith("Could not read ")) {
        if (!kept.includes(sentence)) kept.push(sentence);
        continue;
      }
      if (CUTOFF_PREFIXES.some((prefix) => sentence.startsWith(prefix))) cutoff = true;
    }
  }
  if (cutoff) kept.push(PAGE_CUTOFF_NOTE);
  return kept.join(" ").slice(0, 2000);
}

export function buildImportNotice(input: {
  failures: string[];
  explanations?: string[];
  rateLimited?: string[];
  readerNotes: string[];
  stored: boolean;
  duplicateCheckFailed: boolean;
  duplicateCount: number;
}): string | null {
  const limited = input.rateLimited ?? [];
  const parts = [
    input.failures.length > 0 ? `Could not read ${input.failures.join(", ")}.` : "",
    ...(input.explanations ?? []),
    limited.length > 0
      ? `Upload limit reached. Wait a few minutes, then try ${limited.join(", ")} again.`
      : "",
    publishReaderNotes(input.readerNotes),
    input.stored ? "" : "The file itself was not stored, but the lines below are ready to review.",
    input.duplicateCheckFailed
      ? "Could not check these against what you already logged."
      : input.duplicateCount > 0
        ? `${input.duplicateCount === 1 ? "1 line matches" : `${input.duplicateCount} lines match`} something already logged. Those stay out unless you merge or add them.`
        : "",
  ].filter(Boolean);
  return parts.join(" ") || null;
}
