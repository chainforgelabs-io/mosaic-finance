export interface SetupStatus {
  planSet: boolean;
  snapshotEver: boolean;
  snapshotThisMonth: boolean;
  goalsCount: number;
  goalsReviewed: boolean;
  reminderDay: number;
  reminderDue: boolean;
}

export type SetupItem = "cash-flow" | "net-worth" | "goals";

export function nextSetupItem(status: SetupStatus): SetupItem | null {
  if (!status.planSet) return "cash-flow";
  if (!status.snapshotEver) return "net-worth";
  if (!status.goalsReviewed) return "goals";
  return null;
}

export function setupItemHref(item: SetupItem): string {
  if (item === "cash-flow") return "/dashboard/cash-flow";
  if (item === "net-worth") return "/dashboard/assets";
  return "/dashboard/goals";
}

export const SETUP_ITEM_LABEL: Record<SetupItem, string> = {
  "cash-flow": "Set up Cash Flow",
  "net-worth": "Check Net Worth",
  goals: "Review Goals",
};
