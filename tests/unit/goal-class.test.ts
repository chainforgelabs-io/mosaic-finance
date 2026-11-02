import { describe, expect, it } from "vitest";
import { savingsSlug } from "@/lib/tracking/create-savings-account";
import {
  CANADA_LIFE_EXPECTANCY_YEARS,
  accountsForGoal,
  goalSummaryLines,
  accountsFromBreakdown,
  accountsFromDebts,
  cardPaydown,
  classifyDebtRoles,
  debtGoalTitle,
  inferGoalClass,
  OMIT_HOME_MORTGAGE,
  linesForGoal,
  mergeMissingAccounts,
  monthShare,
  readGoal,
  startingDebts,
  weeksWithSpending,
  type GoalAccount,
} from "@/lib/tracking/goal-class";

const loan: GoalAccount = { key: "loan-1", name: "Student loan", value: 8000, side: "debt" };
const loanStart: GoalAccount = { key: "loan-1", name: "Student loan", value: 10000, side: "debt" };
const card: GoalAccount = { key: "card-1", name: "Card", value: 1200, side: "debt" };
const tfsa: GoalAccount = { key: "tfsa-1", name: "TFSA", value: 4200, side: "asset", accountType: "TFSA" };
const rrsp: GoalAccount = { key: "rrsp-1", name: "RRSP", value: 50000, side: "asset", accountType: "RRSP" };

const emptyFacts = {
  today: "2026-11-01",
  age: 46,
  exampleMonthly: 4200,
  planExpense: 4200,
  monthExpense: 3800,
  expenseDates: ["2026-10-12", "2026-10-20", "2026-11-01"],
  latest: [] as GoalAccount[],
  history: [] as { date: string; accounts: GoalAccount[] }[],
  startDebts: [] as GoalAccount[],
  loggedByCategory: {} as Record<string, number>,
  spendByMonthCategory: {} as Record<string, number>,
};

describe("goal class from the name", () => {
  it("keeps a retirement age separate from a debt payoff", () => {
    expect(inferGoalClass({ name: "Retirement", goalType: "retirement", amountUnknown: true, targetAge: 60 })).toBe(
      "retirement_age",
    );
    expect(inferGoalClass({ name: "Pay off the mortgage", goalType: "other" })).toBe("debt");
    expect(inferGoalClass({ name: "Home down payment", goalType: "home_purchase", targetAmount: 40000 })).toBe(
      "balance",
    );
  });

  it("treats cost of living as its own measure and leaves a one-off name generic", () => {
    expect(inferGoalClass({ name: "Maintain cost of living", goalType: "other", amountUnknown: true })).toBe(
      "cost_of_living",
    );
    expect(inferGoalClass({ name: "Not sure yet", goalType: "other", amountUnknown: true })).toBe("note");
    expect(inferGoalClass({ name: "Travel", goalType: "vacation", targetAmount: 20000 })).toBe("balance");
  });
});

describe("goal reading", () => {
  it("measures a debt from the balance when the goal began", () => {
    const reading = readGoal(
      {
        name: "Pay off debt",
        goal_type: "debt_payoff",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        baseline_balances: { "loan-1": 10000, "card-1": 1200 },
      },
      { ...emptyFacts, latest: [loan, { ...card, value: 1200 }], startDebts: [loanStart, card] },
    );
    expect(reading.goalClass).toBe("debt");
    if (reading.goalClass !== "debt") return;
    expect(reading.paidDown).toBe(2000);
    expect(reading.stillOwed).toBe(9200);
    expect(goalSummaryLines({ target_age: null, linked_account_ids: [] }, reading)[0]).toContain("paid down");
    expect(reading.rows).toHaveLength(2);
    expect(reading.bar).toBeCloseTo((2000 / 11200) * 100);
    expect(reading.title).toBe("Pay off Consumer debt");
  });

  it("hides a debt that has never had a balance and names what remains", () => {
    const reading = readGoal(
      {
        name: "Pay off debt",
        goal_type: "debt_payoff",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        baseline_balances: { "car-1": 18100, "home-1": 200000, "amex-1": 0 },
      },
      {
        ...emptyFacts,
        hasPrimaryResidence: true,
        latest: [
          { key: "car-1", name: "Car loan", value: 17560, side: "debt" },
          { key: "home-1", name: "Mortgage", value: 199800, side: "debt" },
          { key: "amex-1", name: "Amex", value: 0, side: "debt" },
        ],
      },
    );
    if (reading.goalClass !== "debt") throw new Error("expected debt");
    expect(reading.rows.map((row) => row.name)).toEqual(["Car loan", "Mortgage"]);
    expect(reading.title).toBe("All Debt");
    expect(reading.showHomeMortgage).toBe(true);
    expect(reading.includeHome).toBe(true);
  });

  it("drops the residence mortgage when the goal leaves it out", () => {
    const reading = readGoal(
      {
        name: "Pay off debt",
        goal_type: "debt_payoff",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        linked_account_ids: [OMIT_HOME_MORTGAGE],
        baseline_balances: { "car-1": 18100, "home-1": 200000 },
      },
      {
        ...emptyFacts,
        hasPrimaryResidence: true,
        latest: [
          { key: "car-1", name: "Car loan", value: 17560, side: "debt" },
          { key: "home-1", name: "Mortgage", value: 199800, side: "debt" },
        ],
      },
    );
    if (reading.goalClass !== "debt") throw new Error("expected debt");
    expect(reading.rows.map((row) => row.name)).toEqual(["Car loan"]);
    expect(reading.title).toBe("Pay off Consumer debt");
    expect(reading.includeHome).toBe(false);
    expect(reading.stillOwed).toBe(17560);
  });

  it("names a student loan on its own and a rental mortgage beside other debts", () => {
    expect(debtGoalTitle([{ name: "Student loan", role: "student" }])).toBe("Pay off Student Loan(s)");
    expect(
      debtGoalTitle([
        { name: "Car loan", role: "car" },
        { name: "Rental mortgage", role: "rental_mortgage" },
      ]),
    ).toBe("Pay off Car loan and rental mortgage");
    expect(classifyDebtRoles(["Mortgage"], { hasRentalProperty: true })).toEqual(["rental_mortgage"]);
    expect(classifyDebtRoles(["Mortgage", "Rental mortgage"], { hasPrimaryResidence: true, hasRentalProperty: true })).toEqual([
      "home_mortgage",
      "rental_mortgage",
    ]);
  });

  it("does not treat a typed zero as savings progress", () => {
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
      },
      { ...emptyFacts, latest: [tfsa] },
    );
    expect(reading.goalClass).toBe("balance");
    if (reading.goalClass !== "balance") return;
    expect(reading.current).toBeNull();
    expect(reading.bar).toBeNull();
    expect(reading.needsAccount).toBe(true);
  });

  it("uses the attached account once a savings goal has one", () => {
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        linked_account_ids: ["tfsa-1"],
        linked_plan_categories: ["vacation"],
      },
      { ...emptyFacts, latest: [tfsa], loggedByCategory: { vacation: 150 } },
    );
    if (reading.goalClass !== "balance") throw new Error("expected balance");
    expect(reading.current).toBe(4200);
    expect(reading.bar).toBe(21);
    expect(reading.loggedThisMonth).toBe(150);
  });

  it("states a retirement gap in today's dollars without a return", () => {
    const reading = readGoal(
      {
        name: "Retirement",
        goal_type: "retirement",
        target_amount: null,
        current_amount: 0,
        target_age: 60,
        amount_unknown: true,
        monthly_need: 4200,
      },
      { ...emptyFacts, latest: [rrsp, tfsa] },
    );
    if (reading.goalClass !== "retirement_age") throw new Error("expected retirement");
    expect(reading.yearsUntil).toBe(14);
    expect(reading.yearsInRetirement).toBe(CANADA_LIFE_EXPECTANCY_YEARS - 60);
    expect(reading.spendingTotal).toBe(4200 * 12 * (CANADA_LIFE_EXPECTANCY_YEARS - 60));
    expect(reading.balance).toBe(54200);
    expect(reading.gap).toBe(reading.spendingTotal! - 54200);
    expect(reading.bar).toBeNull();
    const lines = goalSummaryLines({ target_age: 60, linked_account_ids: [] }, reading);
    expect(lines.join(" ")).toContain("years from now");
    expect(lines.join(" ")).toContain("apart in today's dollars");
    expect(lines.join(" ").toLowerCase()).not.toContain("not sure");
  });

  it("counts weeks logged and the month against the plan", () => {
    const reading = readGoal(
      {
        name: "Maintain cost of living",
        goal_type: "other",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: true,
      },
      emptyFacts,
    );
    if (reading.goalClass !== "cost_of_living") throw new Error("expected cost of living");
    expect(reading.weeksLogged).toBe(weeksWithSpending(emptyFacts.expenseDates, emptyFacts.today));
    expect(reading.weeksLogged).toBe(3);
    expect(reading.budget).toBe(4200);
    expect(reading.tracked).toBe(3800);
    expect(reading.budgetSource).toBe("plan");
    expect(reading.monthComplete).toBe(false);
    expect(monthShare("2026-11-01")).toEqual({ day: 1, days: 30, complete: false });
    const lines = goalSummaryLines({ target_age: null, linked_account_ids: [] }, reading);
    expect(lines[0]).toContain("Logged");
    expect(lines.join(" ")).toContain("logged this month");
    expect(lines.join(" ").toLowerCase()).not.toContain("not sure");
  });

  it("compares cost of living with the full plan only on the last day", () => {
    const reading = readGoal(
      {
        name: "Maintain cost of living",
        goal_type: "other",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: true,
      },
      { ...emptyFacts, today: "2026-11-30" },
    );
    if (reading.goalClass !== "cost_of_living") throw new Error("expected cost of living");
    expect(monthShare("2026-11-30").complete).toBe(true);
    expect(reading.monthComplete).toBe(true);
    expect(monthShare("2026-02-28")).toEqual({ day: 28, days: 28, complete: true });
  });
});

describe("trip funding", () => {
  const cardBefore: GoalAccount = { key: "card-1", name: "Card", value: 400, side: "debt", bucket: "debt" };
  const cardAdded: GoalAccount = { key: "card-1", name: "Card", value: 2400, side: "debt", bucket: "debt" };
  const cardNow: GoalAccount = { key: "card-1", name: "Card", value: 1400, side: "debt", bucket: "debt" };
  const bank: GoalAccount = {
    key: "bank-1",
    name: "Travel fund",
    value: 3000,
    side: "asset",
    accountType: "Bank-Account",
    bucket: "investment",
  };

  it("asks how a trip is paid for and does not offer every plan line", () => {
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
      },
      emptyFacts,
    );
    if (reading.goalClass !== "balance") throw new Error("expected balance");
    expect(reading.trip).toBe(true);
    expect(reading.needsFunding).toBe(true);
    expect(reading.needsPlanLine).toBe(false);
    expect(
      linesForGoal("balance", [
        { slug: "groceries", label: "Groceries", kind: "expense" as const },
        { slug: "paycheque", label: "Paycheque", kind: "income" as const },
        { slug: "resp", label: "RESP", kind: "savings" as const },
        { slug: "debt_principal", label: "Extra debt principal", kind: "savings" as const },
        { slug: "cash_savings", label: "Cash savings", kind: "savings" as const },
      ], true),
    ).toEqual([]);
  });

  it("reads a savings account balance and keeps logged savings separate", () => {
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        funding_method: "set_aside",
        linked_account_ids: ["bank-1"],
        linked_plan_categories: ["travel_fund"],
      },
      { ...emptyFacts, latest: [bank], loggedByCategory: { travel_fund: 500 } },
    );
    if (reading.goalClass !== "balance") throw new Error("expected balance");
    expect(reading.current).toBe(3000);
    expect(reading.loggedThisMonth).toBe(500);
    expect(reading.bar).toBe(15);
    expect(reading.needsPlanLine).toBe(false);
  });

  it("waits for the trip month before comparing cash flow", () => {
    const early = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        funding_method: "cash_flow",
        target_date: "2026-12-01",
      },
      { ...emptyFacts, today: "2026-11-01", spendByMonthCategory: { "2026-12:travel": 900 } },
    );
    if (early.goalClass !== "balance") throw new Error("expected balance");
    expect(early.beforeTrip).toBe(true);
    expect(early.tripSpend).toBeNull();

    const during = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        funding_method: "cash_flow",
        target_date: "2026-11-15",
      },
      {
        ...emptyFacts,
        today: "2026-11-20",
        latest: [cardAdded],
        history: [
          { date: "2026-10-01", accounts: [cardBefore] },
          { date: "2026-11-20", accounts: [cardAdded] },
        ],
        spendByMonthCategory: { "2026-11:travel": 1800 },
      },
    );
    if (during.goalClass !== "balance") throw new Error("expected balance");
    expect(during.beforeTrip).toBe(false);
    expect(during.tripSpend).toBe(1800);
    expect(during.creditChange).toBe(2000);
  });

  it("tracks only the card increase from the trip month", () => {
    expect(cardPaydown({ before: 400, added: 2400, now: 1400 })).toEqual({ increase: 2000, stillOwed: 1000 });
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 2000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        funding_method: "credit",
        payoff_months: 6,
        target_date: "2026-11-01",
        linked_account_ids: ["card-1"],
      },
      {
        ...emptyFacts,
        today: "2026-11-20",
        latest: [cardNow],
        history: [
          { date: "2026-10-01", accounts: [cardBefore] },
          { date: "2026-11-10", accounts: [cardAdded] },
        ],
      },
    );
    if (reading.goalClass !== "balance") throw new Error("expected balance");
    expect(reading.cardIncrease).toBe(2000);
    expect(reading.cardStillOwed).toBe(1000);
    expect(reading.payoffMonths).toBe(6);
    expect(reading.current).toBeNull();
  });
});

describe("goal sheet lines", () => {
  it("offers savings lines for a savings goal and drops groceries, salary, and extra principal", () => {
    const lines = linesForGoal("balance", [
      { slug: "groceries", label: "Groceries", kind: "expense" as const },
      { slug: "paycheque", label: "Paycheque", kind: "income" as const },
      { slug: "debt_principal", label: "Extra debt principal", kind: "savings" as const },
      { slug: "cash_savings", label: "Cash savings", kind: "savings" as const },
    ]);
    expect(lines.map((line) => line.slug)).toEqual(["cash_savings"]);
    expect(linesForGoal("debt", lines)).toEqual([]);
  });

  it("names a new savings line without taking over an expense category", () => {
    expect(savingsSlug("Travel fund")).toBe("travel_fund");
    expect(savingsSlug("Travel")).toBe("travel_savings");
  });

  it("keeps a zero-balance card that is not on the latest check-in", () => {
    const card = accountsFromDebts([{ type: "Credit card", balance: 0 }]);
    expect(card.map((account) => account.name)).toEqual(["Credit card"]);
    expect(card[0]?.value).toBe(0);
    const loan = accountsFromDebts([{ type: "car_loan", amount: 18100 }]);
    expect(mergeMissingAccounts(loan, card).map((account) => account.name)).toEqual(["Car loan", "Credit card"]);
    expect(mergeMissingAccounts(loan, loan)).toHaveLength(1);
    expect(accountsFromDebts(null)).toEqual([]);
    expect(accountsFromDebts({ type: "Credit card" })).toEqual([]);
    expect(accountsFromDebts([null, { type: "Line of credit", balance: "0" }]).map((account) => account.name)).toEqual([
      "Line of credit",
    ]);
  });

  it("keeps a new savings account that is not on the latest check-in", () => {
    const house: GoalAccount = { key: "house", name: "House", value: 100, side: "asset", bucket: "fixed" };
    const bank: GoalAccount = {
      key: "bank-1",
      name: "Travel fund",
      value: 0,
      side: "asset",
      accountType: "Bank-Account",
      bucket: "investment",
    };
    expect(accountsForGoal("balance", [house, bank]).map((account) => account.key)).toEqual(["bank-1"]);
    expect(mergeMissingAccounts([house], [bank]).map((account) => account.name)).toEqual(["House", "Travel fund"]);
  });
});

describe("debt names", () => {
  it("uses the same plain name Net Worth shows for a stored key", () => {
    const accounts = accountsFromBreakdown({
      investments: [],
      fixed_assets: [],
      debts: [
        { type: "car_loan", value: 18100 },
        { name: "Residence mortgage", type: "mortgage", value: 200000 },
      ],
    });
    expect(accounts.map((account) => account.name)).toEqual(["Car loan", "Residence mortgage"]);
  });
});

describe("starting debts", () => {
  it("uses the check-in on or before the goal was created", () => {
    const debts = startingDebts(
      [
        { date: "2026-09-01", accounts: [loanStart] },
        { date: "2026-11-01", accounts: [loan] },
      ],
      "2026-10-15",
    );
    expect(debts.map((account) => account.value)).toEqual([10000]);
  });
});
