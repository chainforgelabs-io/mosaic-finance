CREATE TABLE public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'real_estate', 'vehicle', 'land', 'precious_metals', 'collectibles', 'other'
  )),
  name TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC,
  purchase_date DATE,
  notes TEXT,
  -- Real estate specific (nullable for non-real-estate assets)
  property_city TEXT,
  property_province TEXT,
  property_sqft INTEGER,
  property_bedrooms INTEGER,
  property_bathrooms NUMERIC,
  property_year_built INTEGER,
  property_features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fixed assets"
  ON public.fixed_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_fixed_assets_updated_at
  BEFORE UPDATE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
