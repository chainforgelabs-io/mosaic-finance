export interface SetupStatus {
  planSet: boolean;
  /** False while a seeded plan is waiting for the person to check it. */
  planReviewed: boolean;
  snapshotEver: boolean;
  snapshotThisMonth: boolean;
  goalsCount: number;
  goalsReviewed: boolean;
  reminderDay: number;
  reminderDue: boolean;
}

export type SetupItem = "cash-flow" | "net-worth" | "goals";

export function cashFlowReady(status: Pick<SetupStatus, "planSet" | "planReviewed">): boolean {
  return status.planSet && status.planReviewed;
}

export function nextSetupItem(status: SetupStatus): SetupItem | null {
  if (!cashFlowReady(status)) return "cash-flow";
  if (!status.snapshotEver) return "net-worth";
  if (!status.goalsReviewed) return "goals";
  return null;
}

export function setupItemHref(
  item: SetupItem,
  status?: Pick<SetupStatus, "planSet" | "planReviewed">,
): string {
  if (item === "cash-flow") {
    if (status?.planSet && !status.planReviewed) return "/dashboard/cash-flow/plan";
    return "/dashboard/cash-flow";
  }
  if (item === "net-worth") return "/dashboard/assets";
  return "/dashboard/goals";
}

export function setupItemLabel(item: SetupItem, status: SetupStatus): string {
  if (item === "cash-flow" && status.planSet && !status.planReviewed) return "Confirm Cash Flow";
  return SETUP_ITEM_LABEL[item];
}

export const SETUP_ITEM_LABEL: Record<SetupItem, string> = {
  "cash-flow": "Set up Cash Flow",
  "net-worth": "Check Net Worth",
  goals: "Review Goals",
};
