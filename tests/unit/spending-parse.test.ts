import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfPageChunks } from "@/lib/tracking/pdf-chunks";
import {
  claudeText,
  dedupeSpendingItems,
  normalizeStatementItems,
  matchUploadDuplicates,
  mergeUploadPatch,
  parseSpendingPayload,
  type ExistingSpend,
} from "@/lib/tracking/spending-parse";

describe("parseSpendingPayload", () => {
  it("reads JSON when the text block is not the first block", () => {
    const text = claudeText([
      { type: "thinking", text: "looking at the pages" },
      {
        type: "text",
        text: "```json\n{\"transactions\":[{\"txn_date\":\"2026-09-02\",\"amount\":12.4,\"description\":\"Coffee\",\"suggested_category\":\"dining\"}],\"confidence\":\"high\",\"notes\":\"Skipped 1 deposit.\",\"period_year\":2026,\"period_month\":9}\n```",
      },
    ]);
    const parsed = parseSpendingPayload(text);
    expect(parsed.truncated).toBe(false);
    expect(parsed.periodYear).toBe(2026);
    expect(parsed.periodMonth).toBe(9);
    expect(parsed.notes).toBe("Skipped 1 deposit.");
    expect(Array.isArray(parsed.transactions)).toBe(true);
  });

  it("keeps complete lines when the JSON is cut off", () => {
    const text = "{\"transactions\":[{\"txn_date\":\"2026-09-02\",\"amount\":12.4,\"description\":\"Coffee\",\"suggested_category\":\"dining\"},{\"txn_date\":\"2026-09-03\",\"amount\":40";
    const parsed = parseSpendingPayload(text);
    expect(parsed.truncated).toBe(true);
    expect(parsed.transactions).toEqual([
      { txn_date: "2026-09-02", amount: 12.4, description: "Coffee", suggested_category: "dining" },
    ]);
  });
});

describe("normalizeStatementItems", () => {
  it("counts refunds and deposits as money in, and a refund reversal as spending", () => {
    const rows = normalizeStatementItems(
      [
        {
          txn_date: "2026-09-02",
          amount: 57.11,
          description: "Merchant refund",
          suggested_category: "shopping",
          line_role: "purchase",
        },
        {
          txn_date: "2026-09-03",
          amount: 1500,
          description: "Direct deposit payroll",
          suggested_category: "other",
          line_role: "purchase",
        },
        {
          txn_date: "2026-09-04",
          amount: 20,
          description: "Refund reversal",
          suggested_category: "shopping",
          line_role: "income",
        },
      ],
      "credit",
    );
    expect(rows.map((row) => row.line_role)).toEqual(["income", "income", "purchase"]);
  });
});

describe("dedupeSpendingItems", () => {
  it("drops the same line twice", () => {
    const line = {
      txn_date: "2026-09-02",
      amount: 12.4,
      description: "Coffee",
      suggested_category: "dining" as const,
    };
    expect(dedupeSpendingItems([line, { ...line, description: " coffee " }])).toHaveLength(1);
  });

  it("keeps a second identical line", () => {
    const line = {
      txn_date: "2026-09-02",
      amount: 12.4,
      description: "Coffee",
      suggested_category: "dining" as const,
    };
    expect(dedupeSpendingItems([line, { ...line }])).toHaveLength(2);
  });
});

describe("upload duplicates", () => {
  const existing: ExistingSpend[] = [
    {
      id: "a",
      txn_date: "2026-09-02",
      amount: 12.4,
      category: "dining",
      description: "Coffee",
      note: null,
    },
    {
      id: "b",
      txn_date: "2026-09-02",
      amount: 12.4,
      category: "groceries",
      description: "Market",
      note: null,
    },
  ];

  it("matches the same date and amount, and prefers the closer description", () => {
    const [first] = matchUploadDuplicates(
      [
        {
          txn_date: "2026-09-02",
          amount: 12.4,
          description: "Coffee shop",
          suggested_category: "dining",
        },
      ],
      existing,
    );
    expect(first?.duplicateOf?.id).toBe("a");
    expect(first?.duplicateAction).toBe("skip");
  });

  it("does not reuse one logged row for two statement lines", () => {
    const matched = matchUploadDuplicates(
      [
        {
          txn_date: "2026-09-02",
          amount: 12.4,
          description: "Coffee",
          suggested_category: "dining",
        },
        {
          txn_date: "2026-09-02",
          amount: 12.4,
          description: "Coffee",
          suggested_category: "dining",
        },
      ],
      [existing[0]],
    );
    expect(matched.map((row) => row.duplicateOf?.id ?? null)).toEqual(["a", null]);
  });

  it("does not treat a different merchant as a duplicate", () => {
    const [row] = matchUploadDuplicates(
      [
        {
          txn_date: "2026-09-02",
          amount: 12.4,
          description: "Pharmacy",
          suggested_category: "health",
        },
      ],
      existing,
    );
    expect(row?.duplicateOf).toBeNull();
  });

  it("leaves a different amount alone", () => {
    const [row] = matchUploadDuplicates(
      [
        {
          txn_date: "2026-09-02",
          amount: 8,
          description: "Coffee",
          suggested_category: "dining",
        },
      ],
      existing,
    );
    expect(row?.duplicateOf).toBeNull();
  });

  it("merges statement details without changing the amount", () => {
    expect(
      mergeUploadPatch(
        { description: "", note: null, category: "other" },
        {
          description: "Coffee shop",
          note: null,
          suggested_category: "dining",
          categoryConfirmed: true,
        },
      ),
    ).toEqual({
      description: "Coffee shop",
      category: "dining",
      category_confirmed: true,
    });
    expect(
      mergeUploadPatch(
        { description: "Coffee", note: null, category: "dining" },
        {
          description: "Coffee shop",
          note: null,
          suggested_category: "dining",
          categoryConfirmed: false,
        },
      ),
    ).toEqual({ note: "Coffee shop" });
  });
});

describe("pdfPageChunks", () => {
  it("splits a statement into page groups", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) doc.addPage();
    const chunks = await pdfPageChunks(Buffer.from(await doc.save()), 2);
    expect(chunks.map((chunk) => [chunk.startPage, chunk.endPage])).toEqual([
      [1, 2],
      [3, 4],
      [5, 5],
    ]);
    expect(chunks[0]?.pageCount).toBe(5);
  });
});
