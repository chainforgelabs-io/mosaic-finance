export interface AchievementDef {
  key: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_transaction",
    name: "First log",
    description: "Logged your first spending item",
  },
  {
    key: "log_streak_4",
    name: "Four-week habit",
    description: "Logged spending 4 weeks in a row",
  },
  {
    key: "log_streak_12",
    name: "Quarter of honesty",
    description: "Logged spending 12 weeks in a row",
  },
  {
    key: "log_streak_26",
    name: "Half-year tracker",
    description: "Logged spending 26 weeks in a row",
  },
  {
    key: "first_snapshot",
    name: "Baseline set",
    description: "Saved your first net worth snapshot",
  },
  {
    key: "snapshot_streak_3",
    name: "Quarterly check-in",
    description: "Updated net worth 3 months in a row",
  },
  {
    key: "snapshot_streak_6",
    name: "Half-year check-in",
    description: "Updated net worth 6 months in a row",
  },
  {
    key: "snapshot_streak_12",
    name: "Year of tracking",
    description: "Updated net worth 12 months in a row",
  },
  {
    key: "debt_reduced",
    name: "Debt down",
    description: "Reduced total debt versus your last snapshot",
  },
  {
    key: "net_worth_10k",
    name: "$10K net worth",
    description: "Reached $10,000 net worth",
  },
  {
    key: "net_worth_50k",
    name: "$50K net worth",
    description: "Reached $50,000 net worth",
  },
  {
    key: "net_worth_100k",
    name: "$100K net worth",
    description: "Reached $100,000 net worth",
  },
  {
    key: "net_worth_250k",
    name: "$250K net worth",
    description: "Reached $250,000 net worth",
  },
  {
    key: "net_worth_500k",
    name: "$500K net worth",
    description: "Reached $500,000 net worth",
  },
  {
    key: "net_worth_1m",
    name: "Millionaire tracker",
    description: "Reached $1,000,000 net worth",
  },
  {
    key: "emergency_fund_funded",
    name: "Safety net",
    description: "Emergency fund covers 6+ months of expenses",
  },
  {
    key: "goal_achieved",
    name: "Goal unlocked",
    description: "Marked a financial goal as achieved",
  },
];

export const ACHIEVEMENT_BY_KEY: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a]),
);

export interface AchievementContext {
  transactionCount: number;
  weeklyStreak: number;
  snapshotCount: number;
  monthlyStreak: number;
  netWorth: number | null;
  priorDebtsTotal: number | null;
  currentDebtsTotal: number | null;
  emergencyFundMonths: number | null;
  goalJustAchieved: boolean;
}

const NET_WORTH_GATES: { key: string; amount: number }[] = [
  { key: "net_worth_10k", amount: 10_000 },
  { key: "net_worth_50k", amount: 50_000 },
  { key: "net_worth_100k", amount: 100_000 },
  { key: "net_worth_250k", amount: 250_000 },
  { key: "net_worth_500k", amount: 500_000 },
  { key: "net_worth_1m", amount: 1_000_000 },
];

export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyEarned: Set<string>,
): AchievementDef[] {
  const unlocked: AchievementDef[] = [];

  function award(key: string) {
    if (alreadyEarned.has(key)) return;
    const def = ACHIEVEMENT_BY_KEY[key];
    if (def) unlocked.push(def);
  }

  if (ctx.transactionCount >= 1) award("first_transaction");
  if (ctx.weeklyStreak >= 4) award("log_streak_4");
  if (ctx.weeklyStreak >= 12) award("log_streak_12");
  if (ctx.weeklyStreak >= 26) award("log_streak_26");

  if (ctx.snapshotCount >= 1) award("first_snapshot");
  if (ctx.monthlyStreak >= 3) award("snapshot_streak_3");
  if (ctx.monthlyStreak >= 6) award("snapshot_streak_6");
  if (ctx.monthlyStreak >= 12) award("snapshot_streak_12");

  if (
    ctx.priorDebtsTotal != null &&
    ctx.currentDebtsTotal != null &&
    ctx.currentDebtsTotal < ctx.priorDebtsTotal - 0.5
  ) {
    award("debt_reduced");
  }

  if (ctx.netWorth != null) {
    for (const gate of NET_WORTH_GATES) {
      if (ctx.netWorth >= gate.amount) award(gate.key);
    }
  }

  if (ctx.emergencyFundMonths != null && ctx.emergencyFundMonths >= 6) {
    award("emergency_fund_funded");
  }

  if (ctx.goalJustAchieved) award("goal_achieved");

  return unlocked;
}
