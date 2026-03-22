-- ============================================================
-- Finova AI — Expand Account Types & Add Failed Plan Status
-- Migration 016:
--   1. Drop old account_type CHECK so UPDATE can proceed
--   2. Migrate legacy 'pension' rows to 'DC-RPP'
--   3. Add new CHECK with all Canadian account types
--   4. Add 'failed' to plan status constraint
-- ============================================================

-- 1. Drop the old constraint FIRST
ALTER TABLE public.investment_holdings DROP CONSTRAINT IF EXISTS valid_account_type;

-- 2. Migrate existing 'pension' rows
UPDATE public.investment_holdings
  SET account_type = 'DC-RPP'
  WHERE account_type = 'pension';

-- 3. Add expanded account_type CHECK
ALTER TABLE public.investment_holdings ADD CONSTRAINT valid_account_type CHECK (account_type IN (
  -- Registered Personal
  'RRSP', 'TFSA', 'FHSA', 'RESP', 'RDSP', 'RRIF',
  -- Registered Pension Plans
  'DB-RPP', 'DC-RPP', 'Hybrid-RPP', 'Target-Benefit',
  -- Employer-Sponsored
  'Group-RRSP', 'Group-TFSA', 'DPSP', 'EPSP', 'PRPP', 'VRSP', 'SPP',
  -- Employee Equity / Stock
  'ESOP', 'ESPP', 'DSPP', 'RSU', 'Stock-Options', 'Phantom-Stock', 'EOT',
  -- Locked-In Accounts
  'LIRA', 'LRSP', 'RLSP', 'LIF', 'LRIF', 'PRIF', 'RLIF',
  -- Non-Registered / Other
  'non-registered', 'Joint', 'Corporate', 'In-Trust', 'Annuity'
));

-- 4. Add 'failed' to plan status constraint
ALTER TABLE public.financial_plans DROP CONSTRAINT IF EXISTS valid_plan_status;
ALTER TABLE public.financial_plans ADD CONSTRAINT valid_plan_status
  CHECK (status IN ('generating', 'failed', 'pending_review', 'approved', 'rejected', 'delivered'));
