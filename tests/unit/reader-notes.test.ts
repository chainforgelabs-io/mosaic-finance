import { describe, expect, it } from "vitest";
import { buildImportNotice, PAGE_CUTOFF_NOTE, publishReaderNotes } from "@/lib/tracking/reader-notes";
import {
  alignImportRows,
  confirmCategory,
  filterImportRows,
  firstImportFilter,
  importCategoryChips,
  parseStoredImportSession,
  planCategoryLists,
  type ImportRow,
} from "@/lib/tracking/import-session";

describe("publishReaderNotes", () => {
  it("drops page commentary and keeps a failed file and a cut-off page", () => {
    const notes = publishReaderNotes([
      "Could not read Statements 2.pdf. The other files are listed below.",
      "Page 2 of 4 contains only terms and conditions. One card payment is excluded from spending totals.",
      "The reply was cut off, so later lines on these pages may be missing.",
      "Part of a page was cut off, so some lines may be missing.",
    ]);
    expect(notes).toBe(`Could not read Statements 2.pdf. ${PAGE_CUTOFF_NOTE}`);
  });
});

describe("buildImportNotice", () => {
  it("names the failed file without the reader's page notes", () => {
    const notice = buildImportNotice({
      failures: ["Statements 2.pdf"],
      readerNotes: ["Statement continues on page 3; only page 1 transactions included here."],
      stored: true,
      duplicateCheckFailed: false,
      duplicateCount: 0,
    });
    expect(notice).toBe("Could not read Statements 2.pdf.");
  });

  it("names the upload limit instead of a bad file", () => {
    const notice = buildImportNotice({
      failures: [],
      rateLimited: ["August.pdf", "September.pdf"],
      readerNotes: [],
      stored: true,
      duplicateCheckFailed: false,
      duplicateCount: 0,
    });
    expect(notice).toBe(
      "Upload limit reached. Wait a few minutes, then try August.pdf, September.pdf again.",
    );
    expect(notice).not.toContain("Could not read");
  });
});

function row(patch: Partial<ImportRow>): ImportRow {
  return {
    key: patch.key ?? "1",
    txn_date: "2026-08-23",
    amount: 22.7,
    description: "STARBUCKS",
    suggested_category: "dining",
    included: true,
    categoryConfirmed: false,
    documentId: null,
    duplicateOf: null,
    duplicateAction: "add",
    ...patch,
  };
}

describe("plan categories for a statement import", () => {
  const lists = planCategoryLists([
    { kind: "expense", category: "residence_mortgage", spend_category: "housing" },
    { kind: "expense", category: "home_insurance", spend_category: "insurance" },
    { kind: "income", category: "paycheque" },
    { kind: "savings", category: "tfsa" },
  ]);

  it("uses the plan categories in plan order and adds the catch-all", () => {
    expect(lists.expense).toEqual(["housing", "insurance", "other"]);
    expect(lists.income).toEqual(["paycheque", "other_income"]);
    expect(lists.savings).toEqual(["tfsa", "other_savings"]);
  });

  it("keeps a guess that matches the plan and clears every other guess", () => {
    const aligned = alignImportRows(
      [
        row({ key: "home", suggested_category: "housing" }),
        row({ key: "store", suggested_category: "shopping" }),
        row({ key: "pay", suggested_category: "paycheque", line_role: "income" }),
        row({ key: "tfsa", suggested_category: "tfsa", line_role: "transfer" }),
        row({ key: "rrsp", suggested_category: "rrsp", line_role: "transfer" }),
      ],
      lists,
    );
    expect(aligned.find((item) => item.key === "home")?.suggested_category).toBe("housing");
    const refunds = alignImportRows(
      [row({ key: "back", description: "STORE REFUND", suggested_category: "shopping", line_role: "purchase" })],
      lists,
    );
    expect(refunds[0]).toMatchObject({
      suggested_category: "refund",
      line_role: "transfer",
      categoryConfirmed: true,
    });
    expect(aligned.find((item) => item.key === "store")?.suggested_category).toBe("");
    expect(aligned.find((item) => item.key === "pay")?.suggested_category).toBe("paycheque");
    expect(aligned.find((item) => item.key === "tfsa")?.suggested_category).toBe("tfsa");
    expect(aligned.find((item) => item.key === "tfsa")?.line_role).toBe("savings");
    expect(aligned.find((item) => item.key === "rrsp")?.suggested_category).toBe("");
  });
});

describe("import review filters", () => {
  const rows = [
    row({ key: "a", suggested_category: "dining" }),
    row({ key: "b", suggested_category: "groceries", categoryConfirmed: true }),
    row({ key: "c", suggested_category: "paycheque", line_role: "income" }),
    row({ key: "d", suggested_category: "" }),
  ];
  const order = ["housing", "groceries", "dining", "other", "paycheque", "other_income", "tfsa", "other_savings"];

  it("confirms one category at a time", () => {
    const next = confirmCategory(rows, "dining");
    expect(next.find((item) => item.key === "a")?.categoryConfirmed).toBe(true);
    expect(next.find((item) => item.key === "c")?.categoryConfirmed).toBe(false);
  });

  it("opens on the first sorted category and keeps unassigned lines in Needs a look", () => {
    expect(firstImportFilter(rows, order)).toBe("dining");
    expect(filterImportRows(rows, "needs").map((item) => item.key)).toEqual(["d"]);
    expect(filterImportRows(rows, "dining").map((item) => item.key)).toEqual(["a"]);
    expect(importCategoryChips(rows, order)).toEqual(["dining", "paycheque"]);
  });
});

describe("parseStoredImportSession", () => {
  it("keeps a ready review and drops anything else", () => {
    const raw = JSON.stringify({
      status: "ready",
      rows: [{ key: "1", description: "Cafe", included: true }],
      notice: null,
      error: null,
      aligned: true,
    });
    expect(parseStoredImportSession(raw)?.rows?.[0]?.description).toBe("Cafe");
    expect(parseStoredImportSession("not json")).toBeNull();
    expect(parseStoredImportSession(JSON.stringify({ status: "idle", rows: [] }))).toBeNull();
  });
});
