import { describe, expect, it } from "vitest";
import { buildImportNotice, PAGE_CUTOFF_NOTE, publishReaderNotes } from "@/lib/tracking/reader-notes";
import { confirmCategory, filterImportRows, importCategoryChips, type ImportRow } from "@/lib/tracking/import-session";

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

describe("import review filters", () => {
  const rows = [
    row({ key: "a", suggested_category: "dining" }),
    row({ key: "b", suggested_category: "groceries", categoryConfirmed: true }),
    row({ key: "c", suggested_category: "paycheque" }),
  ];

  it("confirms one category at a time", () => {
    const next = confirmCategory(rows, "dining");
    expect(next.find((item) => item.key === "a")?.categoryConfirmed).toBe(true);
    expect(next.find((item) => item.key === "c")?.categoryConfirmed).toBe(false);
  });

  it("filters needs-a-look and lists category chips in catalog order", () => {
    expect(filterImportRows(rows, "needs").map((item) => item.key)).toEqual(["a", "c"]);
    expect(importCategoryChips(rows)).toEqual(["groceries", "dining", "paycheque"]);
  });
});
