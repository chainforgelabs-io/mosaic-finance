import type { BudgetPlanEntry } from "@/types/tracking";
import { categorySlug } from "@/lib/tracking/categories";
import {
  monthlyPlanAmount,
  roundMoney,
  type RecurringCadence,
} from "@/lib/tracking/cash-capture";
import { monthsOfYear, scheduledMonthAmounts, type PlanKind } from "@/lib/tracking/budget-plan";
import { sheetsFromXlsx } from "@/lib/tracking/xlsx-sheet";

export type SheetCell = string | number | null | undefined;

export interface ParsedPlanImport {
  entries: BudgetPlanEntry[];
  categories: { slug: string; label: string; kind: PlanKind }[];
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const NAME_HEADERS = new Set(["category", "name", "description", "source", "item", "payee"]);
const KIND_HEADERS = new Set(["kind", "type", "section"]);
const AMOUNT_HEADERS = new Set(["amount", "monthly", "payment", "value"]);
const CADENCE_HEADERS = new Set(["frequency", "cadence", "howoften", "often", "schedule"]);
const DATE_HEADERS = new Set(["date", "lastpayment", "lastpaymentdate", "nextdate", "nextpayment", "lastpaid"]);

export function isSpreadsheetFile(file: { name: string; type?: string }): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  return (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    type === "text/csv" ||
    type.includes("spreadsheet") ||
    type.includes("excel")
  );
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const line = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (line.match(/,/g) ?? []).length;
  const semis = (line.match(/;/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

/**
 * Read a budget sheet into plan rows.
 * Accepts a month grid (Income / Expenses / Savings, then Jan–Dec) or a list
 * with name, kind, amount, and an optional frequency and last payment date.
 */
export function entriesFromPlanSheet(rows: SheetCell[][], year: number, used = new Set<string>()): ParsedPlanImport {
  const entries: BudgetPlanEntry[] = [];
  const categories: ParsedPlanImport["categories"] = [];
  let kind: PlanKind | null = null;
  let monthCols: Map<number, number> | null = null;
  let kindCol: number | null = null;
  let flat: FlatHeader | null = null;

  for (const row of rows) {
    if (!row || row.every((cell) => textOf(cell) === "" && typeof cell !== "number")) continue;
    const section = sectionKind(row);
    if (section) {
      kind = section;
      continue;
    }
    const months = monthColumns(row);
    if (months) {
      monthCols = months;
      kindCol = headerColumn(row, months, KIND_HEADERS);
      flat = null;
      const lead = kindFromWord(textOf(row[0]));
      if (lead) kind = lead;
      continue;
    }
    const header = flatHeader(row);
    if (header) {
      flat = header;
      monthCols = null;
      continue;
    }
    if (monthCols) {
      const rowKind = (kindCol != null ? kindFromWord(textOf(row[kindCol])) : null) ?? kind;
      if (!rowKind) continue;
      addGridRow(row, rowKind, monthCols, year, used, entries, categories);
      continue;
    }
    if (flat) addFlatRow(row, flat, kind, year, used, entries, categories);
  }

  return { entries, categories };
}

export async function readPlanFile(file: File, year: number): Promise<ParsedPlanImport> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls") && !name.endsWith(".xlsx")) throw new Error("xls");
  if (name.endsWith(".csv") || (file.type ?? "").toLowerCase() === "text/csv") {
    return entriesFromPlanSheet(parseCsv(await file.text()), year);
  }
  const sheets = await sheetsFromXlsx(await file.arrayBuffer());
  const used = new Set<string>();
  const merged: ParsedPlanImport = { entries: [], categories: [] };
  for (const rows of sheets) {
    const parsed = entriesFromPlanSheet(rows, year, used);
    merged.entries.push(...parsed.entries);
    merged.categories.push(...parsed.categories);
  }
  return merged;
}

interface FlatHeader {
  name: number;
  kind: number | null;
  amount: number;
  cadence: number | null;
  date: number | null;
}

function addGridRow(
  row: SheetCell[],
  kind: PlanKind,
  monthCols: Map<number, number>,
  year: number,
  used: Set<string>,
  entries: BudgetPlanEntry[],
  categories: ParsedPlanImport["categories"],
) {
  const label = nameFromRow(row, monthCols);
  if (skipName(label)) return;
  const slug = uniqueSlug(label, used);
  if (!slug) return;
  const months = monthsOfYear(year);
  let wrote = false;
  for (const [index, monthIndex] of monthCols) {
    const amount = amountOf(row[index]);
    if (amount == null) continue;
    const month = months[monthIndex];
    if (!month) continue;
    entries.push({ kind, category: slug, month, amount });
    wrote = true;
  }
  if (wrote) categories.push({ slug, label, kind });
}

function addFlatRow(
  row: SheetCell[],
  header: FlatHeader,
  sectionKind: PlanKind | null,
  year: number,
  used: Set<string>,
  entries: BudgetPlanEntry[],
  categories: ParsedPlanImport["categories"],
) {
  const label = textOf(row[header.name]);
  if (skipName(label)) return;
  const kind = (header.kind != null ? kindFromWord(textOf(row[header.kind])) : null) ?? sectionKind;
  if (!kind) return;
  const amount = amountOf(row[header.amount]);
  if (amount == null || amount <= 0) return;
  const slug = uniqueSlug(label, used);
  if (!slug) return;
  const cadence = header.cadence != null ? cadenceFrom(textOf(row[header.cadence])) : null;
  const date = header.date != null ? isoDate(row[header.date]) : null;
  const months = monthsOfYear(year);
  if (cadence && date) {
    for (const slot of scheduledMonthAmounts(amount, cadence, date, year)) {
      entries.push({ kind, category: slug, month: slot.month, amount: slot.amount });
    }
  } else if (cadence) {
    const monthly = monthlyPlanAmount(amount, cadence, "each");
    for (const month of months) entries.push({ kind, category: slug, month, amount: monthly });
  } else {
    for (const month of months) entries.push({ kind, category: slug, month, amount });
  }
  categories.push({ slug, label, kind });
}

function headerColumn(row: SheetCell[], months: Map<number, number>, names: Set<string>): number | null {
  for (let i = 0; i < row.length; i++) {
    if (months.has(i)) continue;
    if (names.has(headerKey(row[i]))) return i;
  }
  return null;
}

function flatHeader(row: SheetCell[]): FlatHeader | null {
  const keys = row.map((cell) => headerKey(cell));
  const find = (names: Set<string>) => {
    const index = keys.findIndex((key) => names.has(key));
    return index >= 0 ? index : null;
  };
  const name = find(NAME_HEADERS);
  const amount = keys.findIndex((key) => AMOUNT_HEADERS.has(key) || key.includes("amount"));
  if (name == null || amount < 0) return null;
  return { name, amount, kind: find(KIND_HEADERS), cadence: find(CADENCE_HEADERS), date: find(DATE_HEADERS) };
}

function headerKey(cell: SheetCell): string {
  return textOf(cell).toLowerCase().replace(/[^a-z]/g, "");
}

function sectionKind(row: SheetCell[]): PlanKind | null {
  const texts = row.map((cell) => textOf(cell)).filter(Boolean);
  if (texts.length !== 1) return null;
  return kindFromWord(texts[0]);
}

function kindFromWord(value: string): PlanKind | null {
  const text = value.trim().toLowerCase();
  if (text === "income") return "income";
  if (text === "expense" || text === "expenses") return "expense";
  if (text === "saving" || text === "savings") return "savings";
  return null;
}

function monthColumns(row: SheetCell[]): Map<number, number> | null {
  const map = new Map<number, number>();
  row.forEach((cell, index) => {
    const month = monthIndex(cell);
    if (month != null && !map.has(index)) map.set(index, month);
  });
  return map.size >= 3 ? map : null;
}

function monthIndex(cell: SheetCell): number | null {
  if (typeof cell === "number" && cell > 20000 && cell < 80000) {
    const iso = excelSerialToIso(cell);
    if (!iso || iso.slice(8, 10) !== "01") return null;
    return Number(iso.slice(5, 7)) - 1;
  }
  const letters = textOf(cell)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!letters) return null;
  const short = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  for (let i = 0; i < 12; i++) {
    if (letters === short[i] || letters === MONTH_NAMES[i]) return i;
  }
  return null;
}

function nameFromRow(row: SheetCell[], monthCols: Map<number, number>): string {
  for (let i = 0; i < row.length; i++) {
    if (monthCols.has(i) || typeof row[i] === "number") continue;
    const text = textOf(row[i]);
    if (text && monthIndex(row[i]) == null && !kindFromWord(text)) return text;
  }
  return "";
}

function skipName(name: string): boolean {
  const text = name.trim().toLowerCase();
  if (!text) return true;
  if (/^enter\b/.test(text)) return true;
  if (text.startsWith("to be allocated")) return true;
  if (/^(total|subtotal|grand total)\b/.test(text)) return true;
  return false;
}

function amountOf(cell: SheetCell): number | null {
  if (cell == null || cell === "") return null;
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return null;
    return roundMoney(Math.abs(cell));
  }
  const clean = cell.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!clean || clean === "-" || clean === ".") return null;
  const value = Number(clean);
  if (!Number.isFinite(value)) return null;
  return roundMoney(Math.abs(value));
}

function textOf(cell: SheetCell): string {
  if (cell == null) return "";
  if (typeof cell === "number") return Number.isFinite(cell) ? String(cell) : "";
  return cell.trim();
}

function cadenceFrom(value: string): RecurringCadence | null {
  const text = value.toLowerCase();
  if (!text) return null;
  if (/bi-?\s*weekly|every\s*2\s*weeks|every\s*two\s*weeks/.test(text)) return "biweekly";
  if (/semi-?\s*monthly|twice a month/.test(text)) return "semimonthly";
  if (/every\s*4\s*months|every\s*four\s*months/.test(text)) return "every4months";
  if (/quarterly|every\s*3\s*months|every\s*three\s*months/.test(text)) return "quarterly";
  if (/semi-?\s*annual|every\s*6\s*months|twice a year/.test(text)) return "semiannual";
  if (/weekly|every week/.test(text)) return "weekly";
  if (/yearly|annual/.test(text)) return "yearly";
  if (/monthly|every month/.test(text)) return "monthly";
  return null;
}

function isoDate(cell: SheetCell): string | null {
  if (typeof cell === "number" && cell > 20000 && cell < 80000) return excelSerialToIso(cell);
  return isoFromText(textOf(cell));
}

function isoFromText(text: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slash = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!slash) return null;
  const a = Number(slash[1]);
  const b = Number(slash[2]);
  const year = slash[3];
  const month = a > 12 ? b : a;
  const day = a > 12 ? a : b;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function excelSerialToIso(serial: number): string | null {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function uniqueSlug(label: string, used: Set<string>): string | null {
  const base = categorySlug(label);
  if (!base) return null;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let n = 2; n < 20; n++) {
    const suffix = `_${n}`;
    const next = `${base.slice(0, 40 - suffix.length)}${suffix}`;
    if (!used.has(next)) {
      used.add(next);
      return next;
    }
  }
  return null;
}
