import { z } from "zod";

export const EMPLOYMENT_TYPES = [
  "Employed",
  "Self-Employed",
  "Retired",
  "Student",
] as const;

export const FAMILY_STRUCTURES = [
  "Single",
  "Married",
  "Common-Law",
  "Single Parent",
  "Family",
] as const;

export const SEX_OPTIONS = [
  "male",
  "female",
  "other",
  "prefer-not-to-say",
] as const;

export const RELATIONSHIP_TYPES = [
  "spouse",
  "child",
  "parent",
  "sibling",
  "other",
] as const;

const householdMemberSchema = z.object({
  relationship: z.enum(RELATIONSHIP_TYPES),
  age: z.number().int().min(0).max(120).optional(),
  sex: z.enum(SEX_OPTIONS).optional(),
  occupation: z.string().optional(),
  annualIncome: z.number().min(0).optional(),
  isDependant: z.boolean(),
  notes: z.string().optional(),
});

export const financialProfileSchema = z.object({
  age: z
    .number({ message: "Age is required" })
    .int("Age must be a whole number")
    .min(16, "You must be at least 16")
    .max(120, "Please enter a valid age"),
  sex: z.enum(SEX_OPTIONS, { message: "Please select" }).optional(),
  annualIncome: z.number().min(0).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    message: "Please select your employment type",
  }),
  familyStructure: z.enum(FAMILY_STRUCTURES, {
    message: "Please select your family structure",
  }),
  householdMembers: z.array(householdMemberSchema).optional(),
});

export type FinancialProfileFormData = z.infer<typeof financialProfileSchema>;
export type HouseholdMemberFormData = z.infer<typeof householdMemberSchema>;
