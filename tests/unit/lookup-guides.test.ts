import { describe, expect, it } from "vitest";
import { FACT_FIND_SYSTEM_PROMPT } from "@/lib/claude/prompts/fact-find";
import { transformDbPlanToFinancialPlan } from "@/lib/plan/transform-db-plan";
import { VALID_PLAN_DATA } from "../fixtures/plan-data";
import {
  buildLookupGuides,
  escapeHtml,
  FIGURES_TO_ADD_SECTION,
  figuresToAddNote,
  gapsForReport,
  LOOK_UP_LATER_LABEL,
  LOOKUP_TOPICS,
  parseInformationGaps,
  SEE_WHERE_TO_FIND_THEM,
  type InformationGap,
} from "@/lib/reference/lookup-guides";

const gap = (
  topic: InformationGap["topic"],
  missing = `${topic} figure`,
  institution: string | null = null,
): InformationGap => ({ topic, missing, institution });

const CHAT = "2026-11-01T12:00:00.000Z";

describe("parseInformationGaps", () => {
  it("keeps valid rows and drops unknown topics", () => {
    expect(
      parseInformationGaps([
        { topic: "income", institution: "CIBC", missing: "gross pay", knows_where: true },
        { topic: "pets", institution: null, missing: "x" },
        { not: "a gap" },
      ]),
    ).toEqual([{ topic: "income", missing: "gross pay", institution: "CIBC" }]);
  });

  it("trims, caps each field at 60 characters, and treats a blank institution as none", () => {
    const [parsed] = parseInformationGaps([
      { topic: "savings", missing: `  ${"balance".repeat(20)}  `, institution: "   " },
    ]);
    expect(parsed.missing).toHaveLength(60);
    expect(parsed.missing.startsWith("balance")).toBe(true);
    expect(parsed.institution).toBeNull();
  });

  it("dedupes on topic and missing, and keeps at most six", () => {
    const rows = [
      gap("debts", "Mortgage balance", "CIBC"),
      gap("debts", "mortgage balance", "RBC"),
      ...LOOKUP_TOPICS.map((topic) => gap(topic, `${topic} other`)),
    ];
    const parsed = parseInformationGaps(rows);
    expect(parsed).toHaveLength(6);
    expect(parsed.filter((item) => item.missing.toLowerCase() === "mortgage balance")).toHaveLength(1);
    expect(parsed[0].institution).toBe("CIBC");
  });

  it("returns nothing for a missing list", () => {
    expect(parseInformationGaps(null)).toEqual([]);
    expect(parseInformationGaps({})).toEqual([]);
  });
});

describe("gapsForReport", () => {
  const one = [gap("debts", "mortgage balance", "CIBC")];

  it("keeps the gaps on the first report after the chat", () => {
    expect(gapsForReport(one, { chatCompletedAt: CHAT, earlierReportDates: [] })).toEqual(one);
  });

  it("drops the gaps once a report has already followed the chat", () => {
    expect(
      gapsForReport(one, {
        chatCompletedAt: CHAT,
        earlierReportDates: ["2026-11-02T12:00:00.000Z"],
      }),
    ).toEqual([]);
  });

  it("keeps the gaps when a failed report is left out of the earlier dates", () => {
    expect(gapsForReport(one, { chatCompletedAt: CHAT, earlierReportDates: [] })).toEqual(one);
  });

  it("keeps the gaps when the chat was done again after an older report", () => {
    expect(
      gapsForReport(one, {
        chatCompletedAt: "2026-11-10T12:00:00.000Z",
        earlierReportDates: ["2026-11-02T12:00:00.000Z"],
      }),
    ).toEqual(one);
  });

  it("hides the gaps when the chat time is unknown and a report already exists", () => {
    expect(
      gapsForReport(one, { chatCompletedAt: null, earlierReportDates: ["2026-11-02T12:00:00.000Z"] }),
    ).toEqual([]);
  });
});

describe("buildLookupGuides", () => {
  const guides = buildLookupGuides(LOOKUP_TOPICS.map((topic) => gap(topic)));

  it("sends income to Budget plan and balances to Net Worth", () => {
    expect(guides.find((guide) => guide.topic === "income")).toMatchObject({
      href: "/dashboard/cash-flow/plan",
      linkLabel: "Add it in Budget plan",
    });
    for (const topic of ["savings", "investments", "debts"] as const) {
      expect(guides.find((guide) => guide.topic === topic)).toMatchObject({
        href: "/dashboard/assets",
        linkLabel: "Add it in Net Worth",
      });
    }
  });

  it("gives insurance no link and points its cash value at Net Worth", () => {
    const insurance = guides.find((guide) => guide.topic === "insurance");
    expect(insurance?.href).toBeNull();
    expect(insurance?.linkLabel).toBeNull();
    expect(insurance?.checklist.join(" ")).toMatch(/cash surrender value/);
    expect(insurance?.checklist.join(" ")).toMatch(/Net Worth/);
    expect(insurance?.checklist.join(" ")).toMatch(/coverage, not an asset/);
  });

  it("uses the statement line instead of a phone number", () => {
    for (const guide of guides) {
      expect(guide.howToReach).toBe(
        "Use the number on your card or a recent statement, or the institution's own website.",
      );
      expect(guide).not.toHaveProperty("phone");
      expect(guide.checklist.length).toBeGreaterThanOrEqual(2);
      expect(guide.checklist.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("figures to add note", () => {
  it("names the missing figures and points at the list", () => {
    expect(figuresToAddNote(["gross pay", "TFSA balance"])).toBe(
      "This report was put together without 2 figures you were not sure of: gross pay, TFSA balance. See where to find them.",
    );
    expect(figuresToAddNote(["gross pay"])).toBe(
      "This report was put together without 1 figures you were not sure of: gross pay. See where to find them.",
    );
    expect(figuresToAddNote([])).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes the characters a figure label could carry into the PDF", () => {
    expect(escapeHtml(`A & B <script> "x"`)).toBe("A &amp; B &lt;script&gt; &quot;x&quot;");
  });
});

describe("fact-find prompt", () => {
  it("asks one follow-up, caps it in a quick overview, and drops knows_where", () => {
    expect(FACT_FIND_SYSTEM_PROMPT).toContain(
      "No problem. Which bank, insurer, or employer holds that?",
    );
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("ask that follow-up at most twice");
    expect(FACT_FIND_SYSTEM_PROMPT).toContain(
      "Do not open a full insurance interview in quick mode",
    );
    expect(FACT_FIND_SYSTEM_PROMPT).not.toContain("Do you know where to go to find that?");
    expect(FACT_FIND_SYSTEM_PROMPT).not.toContain("knows_where");
    expect(FACT_FIND_SYSTEM_PROMPT).toMatch(/income\|savings\|investments\|insurance\|debts/);
  });
});

describe("report transform", () => {
  it("adds Figures to add, with a link and no phone, when gaps were stored", () => {
    const plan = transformDbPlanToFinancialPlan({
      id: "p1",
      status: "delivered",
      created_at: "2026-10-09T00:00:00.000Z",
      plan_data: {
        ...VALID_PLAN_DATA,
        information_to_gather: [
          {
            topic: "income",
            missing: "gross pay",
            institution: "CIBC",
            phone: "1-800-465-2422",
          },
        ],
      },
    });
    const section = plan.sections.find((item) => item.id === FIGURES_TO_ADD_SECTION.id);
    expect(section?.title).toBe("Figures to add");
    expect(section?.subtitle).toBe(FIGURES_TO_ADD_SECTION.subtitle);
    expect(section?.disclaimer).toBe("This is educational information, not financial advice.");
    expect(section?.lookupGuides?.[0]).toMatchObject({
      missing: "gross pay",
      institution: "CIBC",
      href: "/dashboard/cash-flow/plan",
      linkLabel: "Add it in Budget plan",
    });
    expect(section?.lookupGuides?.[0]).not.toHaveProperty("phone");
    expect(JSON.stringify(section)).not.toContain("1-800");
    expect(figuresToAddNote(["gross pay"])).toContain(SEE_WHERE_TO_FIND_THEM);
  });

  it("omits the section when there are no gaps", () => {
    const plan = transformDbPlanToFinancialPlan({
      id: "p1",
      status: "delivered",
      created_at: "2026-10-09T00:00:00.000Z",
      plan_data: VALID_PLAN_DATA,
    });
    expect(plan.sections.some((item) => item.id === FIGURES_TO_ADD_SECTION.id)).toBe(false);
  });
});

describe("lookup guide copy", () => {
  const guides = buildLookupGuides(LOOKUP_TOPICS.map((topic) => gap(topic, "example")));
  const copy = [
    FIGURES_TO_ADD_SECTION.title,
    FIGURES_TO_ADD_SECTION.subtitle,
    FIGURES_TO_ADD_SECTION.disclaimer,
    LOOK_UP_LATER_LABEL,
    SEE_WHERE_TO_FIND_THEM,
    figuresToAddNote(["example"]) ?? "",
    ...guides.flatMap((guide) => [guide.title, guide.howToReach, guide.linkLabel ?? "", ...guide.checklist]),
  ].join("\n");

  it("stays educational and does not name an advisor, a return, or a buy or sell", () => {
    const forbidden = [
      /financial advisor/i,
      /financial planner/i,
      /personalized asset allocation/i,
      /which account to prioriti[sz]e/i,
      /we recommend/i,
      /\b(buy|sell)\b/i,
      /\b(CFP|CIM)\b/,
      /\breturns?\b/i,
      /performance/i,
      /dollars saved/i,
      /guarantee/i,
    ];
    for (const pattern of forbidden) {
      expect(copy).not.toMatch(pattern);
    }
  });
});
