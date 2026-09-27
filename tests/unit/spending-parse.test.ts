import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfPageChunks } from "@/lib/tracking/pdf-chunks";
import { claudeText, dedupeSpendingItems, parseSpendingPayload } from "@/lib/tracking/spending-parse";

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
