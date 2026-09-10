import { calculateSavingsRate } from "@/lib/calculations/financial";

export interface HealthScoreInputs {
  annualIncome: number | null;
  monthlyExpenses: number | null;
  emergencyFundMonths: number | null;
  totalDebt: number | null;
  netWorth: number | null;
  priorNetWorth: number | null;
  weeklyStreak: number;
  monthlySnapshotStreak: number;
  activeGoals: number;
  achievedGoals: number;
}

export interface HealthScoreBreakdown {
  savings: number;
  emergency: number;
  debt: number;
  netWorthTrend: number;
  goals: number;
  consistency: number;
}

export interface DerivedHealthScore {
  score: number;
  breakdown: HealthScoreBreakdown;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function savingsComponent(annualIncome: number | null, monthlyExpenses: number | null): number {
  if (annualIncome == null || monthlyExpenses == null || annualIncome <= 0) return 40;
  const rate = calculateSavingsRate(annualIncome, monthlyExpenses);
  if (rate >= 20) return 100;
  if (rate >= 15) return 85;
  if (rate >= 10) return 70;
  if (rate >= 5) return 50;
  return 30;
}

function emergencyComponent(months: number | null): number {
  if (months == null) return 35;
  if (months >= 6) return 100;
  if (months >= 3) return 75;
  if (months >= 1) return 50;
  return 20;
}

function debtComponent(annualIncome: number | null, totalDebt: number | null): number {
  if (totalDebt == null) return 50;
  if (totalDebt <= 0) return 100;
  if (annualIncome == null || annualIncome <= 0) return 40;
  const ratio = totalDebt / annualIncome;
  if (ratio <= 0.2) return 90;
  if (ratio <= 0.5) return 70;
  if (ratio <= 1) return 50;
  if (ratio <= 2) return 30;
  return 15;
}

function netWorthComponent(netWorth: number | null, priorNetWorth: number | null): number {
  if (netWorth == null) return 40;
  let base = 50;
  if (netWorth >= 0) base += 15;
  if (netWorth >= 10_000) base += 10;
  if (priorNetWorth != null && netWorth > priorNetWorth) base += 20;
  if (priorNetWorth != null && netWorth < priorNetWorth) base -= 15;
  return clamp(base);
}

function goalsComponent(activeGoals: number, achievedGoals: number): number {
  if (activeGoals + achievedGoals === 0) return 35;
  const progress = achievedGoals / (activeGoals + achievedGoals);
  return clamp(40 + progress * 50 + Math.min(activeGoals, 3) * 5);
}

function consistencyComponent(weeklyStreak: number, monthlySnapshotStreak: number): number {
  const weekly = Math.min(weeklyStreak, 12) / 12;
  const monthly = Math.min(monthlySnapshotStreak, 6) / 6;
  return clamp(20 + weekly * 50 + monthly * 30);
}

export function calculateDerivedHealthScore(inputs: HealthScoreInputs): DerivedHealthScore {
  const breakdown: HealthScoreBreakdown = {
    savings: savingsComponent(inputs.annualIncome, inputs.monthlyExpenses),
    emergency: emergencyComponent(inputs.emergencyFundMonths),
    debt: debtComponent(inputs.annualIncome, inputs.totalDebt),
    netWorthTrend: netWorthComponent(inputs.netWorth, inputs.priorNetWorth),
    goals: goalsComponent(inputs.activeGoals, inputs.achievedGoals),
    consistency: consistencyComponent(inputs.weeklyStreak, inputs.monthlySnapshotStreak),
  };

  const score = clamp(
    breakdown.savings * 0.2 +
      breakdown.emergency * 0.2 +
      breakdown.debt * 0.15 +
      breakdown.netWorthTrend * 0.15 +
      breakdown.goals * 0.1 +
      breakdown.consistency * 0.2,
  );

  return { score, breakdown };
}
