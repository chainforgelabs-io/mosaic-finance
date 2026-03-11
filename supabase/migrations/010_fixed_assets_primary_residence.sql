ALTER TABLE public.fixed_assets
  ADD COLUMN is_primary_residence BOOLEAN NOT NULL DEFAULT false;
