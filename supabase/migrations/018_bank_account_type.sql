-- Rename Savings-Account -> Bank-Account for cash / bank / emergency fund holdings
UPDATE public.investment_holdings
  SET account_type = 'Bank-Account'
  WHERE account_type = 'Savings-Account';

ALTER TABLE public.investment_holdings DROP CONSTRAINT IF EXISTS valid_account_type;

ALTER TABLE public.investment_holdings ADD CONSTRAINT valid_account_type CHECK (account_type IN (
  'RRSP', 'TFSA', 'FHSA', 'RESP', 'RDSP', 'RRIF',
  'DB-RPP', 'DC-RPP', 'Hybrid-RPP', 'Target-Benefit',
  'Group-RRSP', 'Group-TFSA', 'DPSP', 'EPSP', 'PRPP', 'VRSP', 'SPP',
  'ESOP', 'ESPP', 'DSPP', 'RSU', 'Stock-Options', 'Phantom-Stock', 'EOT',
  'LIRA', 'LRSP', 'RLSP', 'LIF', 'LRIF', 'PRIF', 'RLIF',
  'non-registered', 'Joint', 'Corporate', 'In-Trust', 'Annuity',
  'Bank-Account'
));
