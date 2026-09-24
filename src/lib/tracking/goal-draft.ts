export type GoalHorizon = "date" | "age";

export interface GoalDraftFields {
  name: string;
  goal_type: string;
  target_amount: string;
  amount_unknown: boolean;
  horizon: GoalHorizon;
  target_date: string;
  target_age: string;
  priority: string;
}

export function horizonFromStored(goal: {
  target_date?: string | null;
  target_age?: number | null;
}): GoalHorizon {
  if (goal.target_age != null && !goal.target_date) return "age";
  return "date";
}

/** Persist one timing field. A date and an age are alternatives, not both. */
export function goalDraftToPayload(draft: GoalDraftFields) {
  const trimmedAge = draft.target_age.trim();
  const age = Number(trimmedAge);
  const validAge =
    draft.horizon === "age" &&
    trimmedAge !== "" &&
    Number.isInteger(age) &&
    age >= 1 &&
    age <= 120;

  const amountText = draft.target_amount.trim();
  const amount = amountText === "" ? null : Number(amountText);

  return {
    name: draft.name.trim(),
    goal_type: draft.goal_type,
    target_amount: draft.amount_unknown || amount == null || Number.isNaN(amount) ? null : amount,
    amount_unknown: draft.amount_unknown,
    target_date: draft.horizon === "date" && draft.target_date ? draft.target_date : null,
    target_age: validAge ? age : null,
    priority: draft.priority,
  };
}
