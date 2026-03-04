import { z } from 'zod';

const ACCOUNT_TYPES = [
  'RRSP',
  'TFSA',
  'FHSA',
  'non-registered',
  'pension',
  'LIRA',
  'RESP',
] as const;

const HoldingItemSchema = z.object({
  ticker: z.string().min(1).max(10),
  name: z.string().min(1).max(200),
  balance: z.number().min(0),
  units: z.number().min(0).optional(),
});

export const CreateHoldingsSchema = z.object({
  accountType: z.enum(ACCOUNT_TYPES),
  holdings: z.array(HoldingItemSchema).min(1),
  totalValue: z.number().min(0),
  source: z.enum(['manual', 'upload']).default('manual'),
});

export type CreateHoldingsInput = z.infer<typeof CreateHoldingsSchema>;
export type HoldingItem = z.infer<typeof HoldingItemSchema>;
