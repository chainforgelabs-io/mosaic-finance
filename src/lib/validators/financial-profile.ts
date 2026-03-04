import { z } from "zod";

export const FinancialProfileSchema = z.object({
  annualIncome: z.number().min(0).max(10_000_000),
  monthlyExpenses: z.number().min(0),
  monthlySavings: z.number().min(0),
  emergencyFundMonths: z.number().min(0).max(60),
  province: z.enum([
    "ON", "BC", "AB", "SK", "MB", "QC", "NS", "NB", "PE", "NL", "NT", "NU", "YT",
  ]),
  retirementTargetAge: z.number().min(45).max(85),
  familyStructure: z.enum([
    "single", "married", "common-law", "single-parent", "family",
  ]),
  employmentType: z.enum([
    "employed", "self-employed", "retired", "student", "other",
  ]),
});

export type FinancialProfile = z.infer<typeof FinancialProfileSchema>;
