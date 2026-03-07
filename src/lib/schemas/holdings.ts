import { z } from "zod";

export const ACCOUNT_TYPES = [
  "RRSP",
  "TFSA",
  "FHSA",
  "Non-Reg",
  "Pension",
  "LIRA",
  "RESP",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

const ACCOUNT_TYPE_DB_MAP: Record<string, string> = {
  "Non-Reg": "non-registered",
  "Pension": "pension",
};

export function toDbAccountType(displayType: string): string {
  return ACCOUNT_TYPE_DB_MAP[displayType] ?? displayType;
}

export const holdingSchema = z.object({
  tickerOrName: z.string().max(100, "Name too long").optional().default(""),
  balance: z
    .number({ message: "Balance is required" })
    .min(0, "Balance must be positive"),
  units: z.number().min(0, "Units must be positive").optional(),
});

export const accountSchema = z.object({
  id: z.string(),
  accountType: z.enum(ACCOUNT_TYPES, {
    message: "Please select an account type",
  }),
  accountName: z.string().max(100).optional(),
  holdings: z.array(holdingSchema).min(1, "Add at least one holding"),
});

export const holdingsSchema = z.object({
  accounts: z.array(accountSchema).min(1, "Add at least one account"),
});

export type HoldingFormData = z.infer<typeof holdingSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;
export type HoldingsFormData = z.infer<typeof holdingsSchema>;
