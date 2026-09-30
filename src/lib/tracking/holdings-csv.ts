export interface CsvHolding {
  ticker: string;
  name: string;
  balance: number;
  units: number | null;
}

export interface CsvHoldingsResult {
  holdings: CsvHolding[];
  skipped: number;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function headerIndex(headers: string[], tests: ((header: string) => boolean)[]): number {
  return headers.findIndex((header) => tests.some((test) => test(header)));
}

function money(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned || /^n\/?a$/i.test(cleaned) || cleaned === "-") return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

/** Read a brokerage export with a header row of security name, symbol, quantity, and value. */
export function parseHoldingsCsv(text: string): CsvHoldingsResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { holdings: [], skipped: 0 };
  const headers = rows[0].map((header) => header.toLowerCase());
  const nameIdx = headerIndex(headers, [
    (header) => header.includes("security name"),
    (header) => header === "name",
    (header) => header.includes("description"),
  ]);
  const symbolIdx = headerIndex(headers, [
    (header) => header === "symbol",
    (header) => header === "ticker",
    (header) => header.includes("symbol"),
  ]);
  const qtyIdx = headerIndex(headers, [
    (header) => header.includes("quantity"),
    (header) => header === "units",
    (header) => header === "shares",
  ]);
  const marketIdx = headerIndex(headers, [(header) => header.includes("market value")]);
  const bookIdx = headerIndex(headers, [(header) => header.includes("book value")]);
  if (nameIdx < 0 && symbolIdx < 0) return { holdings: [], skipped: 0 };

  const holdings: CsvHolding[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const name = (row[nameIdx] ?? "").trim();
    const ticker = (row[symbolIdx] ?? "").trim();
    if (!name && !ticker) continue;
    const balance = money(row[marketIdx]) ?? money(row[bookIdx]);
    if (balance == null) {
      skipped++;
      continue;
    }
    const units = money(row[qtyIdx]);
    holdings.push({
      ticker: ticker || "UNKNOWN",
      name: name || ticker,
      balance,
      units,
    });
  }
  return { holdings, skipped };
}
