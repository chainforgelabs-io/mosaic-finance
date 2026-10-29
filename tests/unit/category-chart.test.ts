import { describe, expect, it } from "vitest";
import { summarizeCategorySlices } from "@/components/charts/SpendingCategoryChart";
import { categoryColor } from "@/lib/tracking/categories";

describe("category colors", () => {
  it("keeps everyday categories on their own colors and gives plan lines different ones", () => {
    expect(categoryColor("groceries")).toBe("#10b981");
    expect(categoryColor("other")).toBe("#9ca3af");
    expect(categoryColor("saskpower")).not.toBe(categoryColor("residence_mortgage"));
    expect(categoryColor("saskpower")).not.toBe("#64748b");
    expect(categoryColor("saskpower")).toBe(categoryColor("saskpower"));
  });
});

describe("category chart slices", () => {
  it("shows every slice when there are only a few", () => {
    const slices = [
      { category: "groceries", amount: 100 },
      { category: "dining", amount: 40 },
      { category: "fuel", amount: 0 },
    ];
    expect(summarizeCategorySlices(slices)).toEqual({
      shown: [
        { category: "groceries", amount: 100 },
        { category: "dining", amount: 40 },
      ],
      rest: [],
    });
  });

  it("keeps the largest six and folds the smaller ones", () => {
    const slices = Array.from({ length: 8 }, (_, index) => ({
      category: `bill_${index}`,
      amount: index + 1,
    }));
    const summary = summarizeCategorySlices(slices);
    expect(summary.shown.map((slice) => slice.amount)).toEqual([8, 7, 6, 5, 4, 3]);
    expect(summary.rest.map((slice) => slice.amount)).toEqual([2, 1]);
  });
});
