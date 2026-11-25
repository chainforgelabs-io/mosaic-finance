/**
 * The in-app tour. Steps are data so the order, the targets, and the copy
 * can be checked without rendering the overlay.
 */

export const TOUR_CHAPTERS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "cash-flow-plan", label: "Cash Flow plan" },
  { id: "logging", label: "Logging" },
  { id: "net-worth", label: "Net Worth" },
  { id: "together", label: "How they fit" },
  { id: "goals", label: "Goals" },
  { id: "charlie", label: "Charlie" },
] as const;

export type TourChapter = (typeof TOUR_CHAPTERS)[number]["id"];

export type TourDemoId = "plan" | "log" | "check-in" | "together";

export interface TourStep {
  id: string;
  chapter: TourChapter;
  path: string;
  /** data-tour values, first match on the page wins. */
  targets: readonly string[];
  title: string;
  body: string;
  demo?: TourDemoId;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "dashboard-picture",
    chapter: "dashboard",
    path: "/dashboard",
    targets: ["dashboard-net-worth", "page-dashboard"],
    title: "Your net worth",
    body: "This is the picture the dashboard opens on: net worth, cash flow, assets, debt, and the emergency fund. It updates from what you track. This is tracking, not advice.",
  },
  {
    id: "dashboard-week",
    chapter: "dashboard",
    path: "/dashboard",
    targets: ["this-week", "page-dashboard"],
    title: "This week",
    body: "Log spending each week from here. The Health Score sits with this week. A monthly net worth snapshot keeps the picture current.",
  },
  {
    id: "plan-sections",
    chapter: "cash-flow-plan",
    path: "/dashboard/cash-flow/plan",
    targets: ["plan-grid", "page-plan"],
    title: "Income, expenses, and savings",
    body: "The cash flow plan is one section for money in, one for expenses, and one for savings. Put a number on each month. Tracking compares what you log with this plan.",
    demo: "plan",
  },
  {
    id: "plan-edit",
    chapter: "cash-flow-plan",
    path: "/dashboard/cash-flow/plan",
    targets: ["plan-grid", "page-plan"],
    title: "Change a month, or fill the year",
    body: "Edit one month on its own, or fill the rest of the year from that amount. Open a line to set how often it is paid and the last payment date.",
    demo: "plan",
  },
  {
    id: "plan-lines",
    chapter: "cash-flow-plan",
    path: "/dashboard/cash-flow/plan",
    targets: ["plan-lines-note", "plan-grid", "page-plan"],
    title: "Build the lines you track",
    body: "The lines you start with are a starting point. Rename any line, or add as many income, expense, and savings lines as you track over time.",
  },
  {
    id: "plan-confirm",
    chapter: "cash-flow-plan",
    path: "/dashboard/cash-flow/plan",
    targets: ["cash-flow-confirm", "plan-grid", "page-plan"],
    title: "Confirm the plan",
    body: "If these lines came from your conversation with Charlie, check each amount, then tap Looks right. A plan you build yourself is already confirmed. The tour stays out of the way, so you can tap it now.",
  },
  {
    id: "log-keypad",
    chapter: "logging",
    path: "/dashboard/cash-flow",
    targets: ["cash-keypad", "page-cash-flow"],
    title: "Log what left the bank",
    body: "Choose Out, enter the amount, and tap a category. That purchase leaves the bank. Hold a category to add a merchant, a date, a split, or a repeat.",
    demo: "log",
  },
  {
    id: "log-repeating",
    chapter: "logging",
    path: "/dashboard/cash-flow",
    targets: ["cash-recurring", "page-cash-flow"],
    title: "Bills and paycheques",
    body: "Repeating bills and paycheques can post on their dates. Confirm one when it matches what left the bank, or skip a period.",
  },
  {
    id: "log-month",
    chapter: "logging",
    path: "/dashboard/cash-flow",
    targets: ["cash-period", "page-cash-flow"],
    title: "The month against the plan",
    body: "Switch to Month to see each category next to the plan. Week is the spending you are logging now.",
  },
  {
    id: "log-review",
    chapter: "logging",
    path: "/dashboard/cash-flow/review",
    targets: ["page-review"],
    title: "The review",
    body: "The review adds up the month: money in, expenses, and what was set aside, next to the plan. It describes what was tracked. It does not say what to change.",
  },
  {
    id: "log-statements",
    chapter: "logging",
    path: "/dashboard/cash-flow",
    targets: ["cash-upload", "page-cash-flow"],
    title: "Statements on Progress",
    body: "On Progress, upload bank and card statements. A card purchase stays separate from the payment that leaves the bank. Crop out account numbers before you upload.",
  },
  {
    id: "worth-accounts",
    chapter: "net-worth",
    path: "/dashboard/assets",
    targets: ["net-worth-hero", "page-net-worth"],
    title: "Accounts, property, and debts",
    body: "Net worth is what you own minus what you owe. Accounts, property, and debts from the conversation are listed here. Check the names and the balances.",
  },
  {
    id: "worth-check-in",
    chapter: "net-worth",
    path: "/dashboard/assets",
    targets: ["page-net-worth", "net-worth-hero"],
    title: "The monthly check-in",
    body: "Once a month, save a snapshot. That snapshot is what the dashboard and your goals read until the next one.",
    demo: "check-in",
  },
  {
    id: "worth-history",
    chapter: "net-worth",
    path: "/dashboard/assets",
    targets: ["net-worth-history", "net-worth-hero"],
    title: "The history",
    body: "Each check-in adds a point. A month can go down. That is part of the record, not a result to chase.",
  },
  {
    id: "worth-reminder",
    chapter: "net-worth",
    path: "/dashboard/assets",
    targets: ["net-worth-reminder", "page-net-worth"],
    title: "The reminder day",
    body: "Pick the day of the month for a reminder to save the snapshot. The reminder does not include dollar amounts.",
  },
  {
    id: "together",
    chapter: "together",
    path: "/dashboard",
    targets: ["dashboard-net-worth", "page-dashboard"],
    title: "How the two trackers meet",
    body: "What you set aside and what you pay down in Cash Flow shows up the next time you check Net Worth. Both feed this dashboard and the Health Score.",
    demo: "together",
  },
  {
    id: "goals-measure",
    chapter: "goals",
    path: "/dashboard/goals",
    targets: ["goals-list", "page-goals"],
    title: "Goals read the trackers",
    body: "Each goal is measured from the accounts and plan lines you attach. A debt goal reads balances on Net Worth. A savings goal can read a savings line from Cash Flow.",
  },
  {
    id: "goals-confirm",
    chapter: "goals",
    path: "/dashboard/goals",
    targets: ["goals-list", "page-goals"],
    title: "Check goals from the conversation",
    body: "Goals that came from Charlie wait until you tap Looks right, or edit an amount or a date. You can add a goal of your own at any time.",
  },
  {
    id: "charlie",
    chapter: "charlie",
    path: "/dashboard/meeting",
    targets: ["page-charlie"],
    title: "Charlie stays",
    body: "Ask Charlie about any of these numbers any time. Charlie, your AI money guide, explains the picture. Educational information, not advice.",
  },
  {
    id: "replay",
    chapter: "charlie",
    path: "/dashboard",
    targets: ["nav-dashboard", "page-dashboard"],
    title: "Replay this tour",
    body: "Tour in the sidebar, and on a phone under More, starts the whole tour or one chapter again. Cash Flow, the budget plan, Net Worth, and Goals each have How this page works. Settings still has Replay the tour.",
  },
];

export function tourStorageKey(userId: string): string {
  return `mosaic-tour-v2:${userId}`;
}

export function chapterStart(chapter: TourChapter | "all"): number {
  if (chapter === "all") return 0;
  const index = TOUR_STEPS.findIndex((step) => step.chapter === chapter);
  return index < 0 ? 0 : index;
}

export function chapterLabel(chapter: TourChapter): string {
  return TOUR_CHAPTERS.find((item) => item.id === chapter)?.label ?? chapter;
}

export function rememberTourStep(userId: string, step: number | "done"): void {
  localStorage.setItem(tourStorageKey(userId), String(step));
}

export function readTourStep(userId: string): number | "done" | null {
  const stored = localStorage.getItem(tourStorageKey(userId));
  if (stored == null) return null;
  if (stored === "done") return "done";
  const index = Number(stored);
  if (!Number.isInteger(index) || index < 0 || index >= TOUR_STEPS.length) return null;
  return index;
}
