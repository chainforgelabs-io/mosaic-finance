import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Service client bypasses RLS so we can see pending_review plans
  const supabase = createServiceClient();

  const { data: plan } = await supabase
    .from('financial_plans')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  return NextResponse.json({ plan });
}
