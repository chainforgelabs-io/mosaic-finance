/**
 * Sanitize user input before it enters any Claude prompt.
 * Strips XML-like tags, instruction-like prefixes, and control characters.
 * Defense-in-depth — Claude is resistant to injection, but in fintech we don't take chances.
 */
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*(system|assistant|human):/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim()
    .slice(0, 4000);
}
