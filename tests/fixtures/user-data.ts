export const SAMPLE_USER_PROFILE = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  alias: 'M.C.',
  age: 32,
  province: 'ON' as const,
  employment_type: 'employed' as const,
  family_structure: 'married' as const,
  subscription_tier: 'advisor' as const,
  role: 'user' as const,
};

/** Advisor / ops user (admin role) — same capabilities as SAMPLE_ADMIN for queue tests */
export const SAMPLE_ADVISOR = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  alias: 'Advisor',
  age: 45,
  province: 'ON' as const,
  employment_type: 'employed' as const,
  family_structure: 'married' as const,
  subscription_tier: 'plan' as const,
  role: 'admin' as const,
};

export const SAMPLE_ADMIN = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  alias: 'Admin',
  age: 40,
  province: 'BC' as const,
  employment_type: 'employed' as const,
  family_structure: 'single' as const,
  subscription_tier: 'advisor' as const,
  role: 'admin' as const,
};

export const SAMPLE_FINANCIAL_PROFILE = {
  annual_income: 95000,
  monthly_expenses: 4200,
  monthly_savings: 1800,
  emergency_fund_months: 4.2,
  province: 'ON',
  retirement_target_age: 63,
  family_structure: 'married',
  employment_type: 'employed',
  debts: [
    { type: 'Credit card', balance: 10000, rate: 19.99, monthly_payment: 300 },
    { type: 'Car loan', balance: 12000, rate: 5.9, monthly_payment: 350 },
    { type: 'Student loan', balance: 6500, rate: 3.5, monthly_payment: 200 },
  ],
  goals: [
    { type: 'Home purchase', target_amount: 150000, target_date: '2028-06-01', priority: 'high' as const },
    { type: 'Retirement', target_amount: 1850000, target_date: '2057-01-01', priority: 'high' as const },
    { type: 'Emergency fund', target_amount: 25200, target_date: '2027-01-01', priority: 'medium' as const },
  ],
  investment_knowledge: 'intermediate' as const,
};

export const SAMPLE_FACT_FIND_RESPONSE = `That's great — you're in a really solid position with a 22% savings rate. Let me summarize everything we've discussed.

<FACT_FIND_COMPLETE>
{
  "annual_income": 95000,
  "monthly_expenses": 4200,
  "monthly_savings": 1800,
  "emergency_fund_months": 4.2,
  "debts": [
    { "type": "Credit card", "balance": 10000, "rate": 19.99, "monthly_payment": 300 },
    { "type": "Car loan", "balance": 12000, "rate": 5.9, "monthly_payment": 350 },
    { "type": "Student loan", "balance": 6500, "rate": 3.5, "monthly_payment": 200 }
  ],
  "goals": [
    { "type": "Home purchase", "target_amount": 150000, "target_date": "2028-06-01", "priority": "high" },
    { "type": "Retirement", "target_amount": 1850000, "target_date": "2057-01-01", "priority": "high" }
  ],
  "retirement_target_age": 63,
  "investment_knowledge": "intermediate",
  "province": "ON",
  "family_structure": "married"
}
</FACT_FIND_COMPLETE>

Does this accurately reflect everything we discussed? If anything looks off, just let me know and I'll adjust it.`;

export const SAMPLE_INCOMPLETE_RESPONSE =
  'Thanks for sharing that. Can you tell me a bit about your current monthly expenses?';

export const SAMPLE_MALFORMED_TAG_RESPONSE = `Here's your summary:
<FACT_FIND_COMPLETE>
{ invalid json here
</FACT_FIND_COMPLETE>`;

export const SAMPLE_NESTED_TAG_RESPONSE = `Summary:
<FACT_FIND_COMPLETE>
<FACT_FIND_COMPLETE>
{"annual_income": 50000}
</FACT_FIND_COMPLETE>
</FACT_FIND_COMPLETE>`;
