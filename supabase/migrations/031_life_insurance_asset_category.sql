-- Cash value of permanent life insurance is a net-worth asset.
-- The death benefit stays coverage and is not stored here.

ALTER TABLE public.fixed_assets
  DROP CONSTRAINT IF EXISTS fixed_assets_category_check;

ALTER TABLE public.fixed_assets
  ADD CONSTRAINT fixed_assets_category_check
  CHECK (category IN (
    'real_estate',
    'vehicle',
    'land',
    'precious_metals',
    'collectibles',
    'life_insurance',
    'other'
  ));
