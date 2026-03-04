import { z } from "zod";
import { PROVINCES } from "./auth";

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
  alias: z
    .string()
    .min(2, "Alias must be at least 2 characters")
    .max(30, "Alias must be 30 characters or less")
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores"),
  age: z
    .number({ message: "Age is required" })
    .int("Age must be a whole number")
    .min(16, "You must be at least 16")
    .max(120, "Please enter a valid age"),
  province: z.enum(PROVINCES, {
    message: "Please select a province",
  }),
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    message: "Please select your employment type",
  }),
  familyStructure: z.enum(FAMILY_STRUCTURES, {
    message: "Please select your family structure",
  }),
});

export type FinancialProfileFormData = z.infer<typeof financialProfileSchema>;
