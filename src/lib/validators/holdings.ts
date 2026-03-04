import { z } from "zod";

export const HoldingsSchema = z.object({
  accountType: z.enum([
    "RRSP", "TFSA", "FHSA", "non-registered", "pension", "LIRA", "RESP",
  ]),
  holdings: z.array(
    z.object({
      ticker: z.string().min(1).max(10),
      name: z.string().min(1),
      balance: z.number().min(0),
      units: z.number().min(0).optional(),
    })
  ),
  totalValue: z.number().min(0),
});

export type Holdings = z.infer<typeof HoldingsSchema>;
