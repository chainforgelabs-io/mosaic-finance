import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CATEGORIES = [
  'real_estate',
  'vehicle',
  'land',
  'precious_metals',
  'collectibles',
  'other',
] as const;

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
] as const;

const fixedAssetBaseSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().min(1).max(200),
  estimated_value: z.number().min(0),
  purchase_price: z.number().min(0).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_primary_residence: z.boolean().optional().default(false),
  property_city: z.string().max(200).optional().nullable(),
  property_province: z.enum(PROVINCES).optional().nullable(),
  property_sqft: z.number().int().min(0).optional().nullable(),
  property_bedrooms: z.number().int().min(0).optional().nullable(),
  property_bathrooms: z.number().min(0).optional().nullable(),
  property_year_built: z.number().int().min(1800).max(2100).optional().nullable(),
  property_features: z.array(z.string()).optional().nullable(),
});

const fixedAssetSchema = fixedAssetBaseSchema.refine(
  (data) => {
    if (data.category === 'real_estate' && !data.is_primary_residence) {
      return data.purchase_price != null && data.purchase_price > 0;
    }
    return true;
  },
  { message: 'Purchase price is required for non-primary-residence real estate (needed for capital gains tax planning)', path: ['purchase_price'] },
);

const patchSchema = fixedAssetBaseSchema.partial().extend({
  id: z.string().uuid(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  return NextResponse.json({ assets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = fixedAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('fixed_assets')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  return NextResponse.json({ asset: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from('fixed_assets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: 'Asset not found or update failed' }, { status: 404 });
  return NextResponse.json({ asset: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing asset id' }, { status: 400 });

  const { error } = await supabase
    .from('fixed_assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
