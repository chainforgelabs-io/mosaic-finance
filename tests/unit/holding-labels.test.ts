import { describe, expect, it } from "vitest";
import { FACT_FIND_SYSTEM_PROMPT } from "@/lib/claude/prompts/fact-find";
import {
  PREFILL_NAME_MAX,
  prefillAccountName,
  prefillFactFindAccount,
  prefillHoldingLabel,
  tidyStoredAccountName,
  tidyStoredHoldingLabel,
} from "@/lib/onboarding/holding-labels";

const CASH_SENTENCE =
  "Cash on hand and emergency float ($1K safe + $5K account float + $6K? consolidated cash plus groceries)";

describe("prefill account names", () => {
  it("names bank cash Cash and drops the consultation sentence", () => {
    expect(prefillAccountName("Bank-Account", CASH_SENTENCE)).toBe("Cash");
    expect(prefillAccountName("savings", "8k emergency fund")).toBe("Cash");
  });

  it("keeps a short label and otherwise uses the account type", () => {
    expect(prefillAccountName("RRSP", "Personal RRSP")).toBe("Personal RRSP");
    expect(prefillAccountName("TFSA", "Personal TFSA")).toBe("Personal TFSA");
    expect(prefillAccountName("RESP", "RESP for two children")).toBe("RESP for two children");
    expect(prefillAccountName("RRSP", CASH_SENTENCE)).toBe("RRSP");
    expect(prefillAccountName("non-registered", "About $29,000 in a taxable account")).toBe(
      "Non-registered",
    );
    expect(prefillAccountName("TFSA", "")).toBe("TFSA");
  });

  it("never returns a name over 100 characters", () => {
    const name = prefillAccountName("RRSP", "x".repeat(180));
    expect(name.length).toBeLessThanOrEqual(PREFILL_NAME_MAX);
    expect(name).toBe("RRSP");
  });
});

describe("prefill holding names", () => {
  it("treats cash as a balance, not a ticker", () => {
    expect(
      prefillHoldingLabel({
        ticker: "CASH",
        name: "Cash (safe + account float)",
      }),
    ).toBe("Cash");
    expect(prefillHoldingLabel({ name: "Cash savings" })).toBe("Cash");
    expect(prefillHoldingLabel({ ticker: "UNKNOWN", name: "chequing" })).toBe("Cash");
  });

  it("keeps a real symbol and a short fund name", () => {
    expect(
      prefillHoldingLabel({
        ticker: "XEQT",
        name: "iShares Core Equity ETF Portfolio",
      }),
    ).toBe("iShares Core Equity ETF Portfolio (XEQT)");
  });

  it("drops a paragraph and keeps the symbol, or Holding when there is none", () => {
    const paragraph =
      "A long note about this fund that explains the whole conversation and is not a name.";
    expect(prefillHoldingLabel({ ticker: "XEQT", name: paragraph })).toBe("XEQT");
    expect(prefillHoldingLabel({ name: paragraph })).toBe("Holding");
    expect(prefillHoldingLabel({ ticker: "VFV", name: "VFV" })).toBe("VFV");
  });

  it("caps every holding label at 100 characters", () => {
    const label = prefillHoldingLabel({ ticker: "X".repeat(140), name: "Y".repeat(140) });
    expect(label.length).toBeLessThanOrEqual(PREFILL_NAME_MAX);
  });
});

describe("prefill fact-find account", () => {
  it("builds a cash account with one Cash holding and the balance", () => {
    const account = prefillFactFindAccount({
      accountType: "Bank-Account",
      description: CASH_SENTENCE,
      approximateBalance: 11000,
      holdings: [
        { ticker: "CASH", name: "Cash (safe + account float)", balance: 11000, units: null },
      ],
    });
    expect(account.accountType).toBe("Bank-Account");
    expect(account.accountName).toBe("Cash");
    expect(account.holdings).toEqual([{ tickerOrName: "Cash", balance: 11000 }]);
  });
});

describe("stored names", () => {
  it("keeps a short saved name and replaces a consultation sentence", () => {
    expect(tidyStoredAccountName("Bank-Account", "Cash on hand")).toBe("Cash on hand");
    expect(tidyStoredAccountName("Bank-Account", CASH_SENTENCE)).toBe("Cash");
    expect(tidyStoredAccountName("RRSP", "Personal RRSP")).toBe("Personal RRSP");
  });

  it("turns a stored cash label back into Cash", () => {
    expect(tidyStoredHoldingLabel("Cash (safe + account float) (CASH)")).toBe("Cash");
    expect(tidyStoredHoldingLabel("iShares Core Equity ETF Portfolio (XEQT)")).toBe(
      "iShares Core Equity ETF Portfolio (XEQT)",
    );
  });
});

describe("fact-find prompt labels", () => {
  it("asks for a short cash label and an empty ticker", () => {
    expect(FACT_FIND_SYSTEM_PROMPT).toContain('description "Cash"');
    expect(FACT_FIND_SYSTEM_PROMPT).toContain('name "Cash"');
    expect(FACT_FIND_SYSTEM_PROMPT).toContain('do not use "CASH" as a ticker');
    expect(FACT_FIND_SYSTEM_PROMPT).not.toContain('ticker "CASH"');
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("40 characters or fewer");
  });
});
