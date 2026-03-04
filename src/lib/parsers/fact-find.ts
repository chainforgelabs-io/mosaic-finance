export interface FactFindData {
  annual_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  emergency_fund_months: number;
  debts: Array<{
    type: string;
    balance: number;
    rate: number;
    monthly_payment: number;
  }>;
  goals: Array<{
    type: string;
    target_amount: number;
    target_date: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  retirement_target_age: number;
  investment_knowledge: 'novice' | 'intermediate' | 'advanced';
  province: string;
  family_structure: string;
}

/**
 * Extract structured fact-find data from a Claude response containing
 * <FACT_FIND_COMPLETE> tags.
 */
export function parseFactFindResponse(
  response: string,
): FactFindData | null {
  const match = response.match(
    /<FACT_FIND_COMPLETE>([\s\S]*?)<\/FACT_FIND_COMPLETE>/,
  );
  if (!match) return null;

  try {
    return JSON.parse(match[1].trim()) as FactFindData;
  } catch {
    return null;
  }
}

export function isFactFindComplete(response: string): boolean {
  return response.includes('<FACT_FIND_COMPLETE>') &&
    response.includes('</FACT_FIND_COMPLETE>');
}

/**
 * Strip the <FACT_FIND_COMPLETE> block from a response, returning
 * only the conversational content for display.
 */
export function stripFactFindTags(response: string): string {
  return response
    .replace(/<FACT_FIND_COMPLETE>[\s\S]*?<\/FACT_FIND_COMPLETE>/, '')
    .trim();
}
