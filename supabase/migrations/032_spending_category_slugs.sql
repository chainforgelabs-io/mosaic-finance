-- Allow built-in categories plus user-added slugs such as condo_fees.
-- The previous check listed a fixed set. This keeps the same values and
-- also accepts a short lowercase slug so a new category can be saved.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_check
  CHECK (category ~ '^[a-z][a-z0-9_]{0,39}$');

ALTER TABLE public.category_budgets DROP CONSTRAINT IF EXISTS category_budgets_category_check;
ALTER TABLE public.category_budgets
  ADD CONSTRAINT category_budgets_category_check
  CHECK (category ~ '^[a-z][a-z0-9_]{0,39}$');
