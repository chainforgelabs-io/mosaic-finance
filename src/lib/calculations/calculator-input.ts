/** Keep what was typed. An empty box stays empty and counts as zero in the math. */
export function parseCalculatorNumber(raw: string): { text: string; value: number } {
  const text = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  if (text === "" || text === ".") return { text, value: 0 };
  const parsed = Number(text);
  return { text, value: Number.isFinite(parsed) ? parsed : 0 };
}
