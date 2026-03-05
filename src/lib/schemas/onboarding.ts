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

export const financialProfileSchema = z.object({
  age: z
    .number({ message: "Age is required" })
    .int("Age must be a whole number")
    .min(16, "You must be at least 16")
    .max(120, "Please enter a valid age"),
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    message: "Please select your employment type",
  }),
  familyStructure: z.enum(FAMILY_STRUCTURES, {
    message: "Please select your family structure",
  }),
});

export type FinancialProfileFormData = z.infer<typeof financialProfileSchema>;
