import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isDeferredDashboardPath } from '@/lib/config/launch-surface';
import { resolveEntitlements } from '@/lib/entitlements';
import { authLandingPath } from '@/lib/onboarding/paths';

/** Same landing rule as sign-in. A finished account goes to the dashboard, not the profile form. */
async function landingPath(supabase: SupabaseClient, userId: string): Promise<string> {
  const [profileRes, factFindRes, riskRes, holdingsRes, planRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('age, employment_type, role, subscription_tier, trial_ends_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('conversation_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_type', 'fact-find')
      .eq('status', 'completed')
      .limit(1)
      .single(),
    supabase.from('risk_profiles').select('id').eq('user_id', userId).limit(1).single(),
    supabase.from('investment_holdings').select('id').eq('user_id', userId).limit(1).single(),
    supabase
      .from('financial_plans')
      .select('id')
      .eq('user_id', userId)
      .neq('status', 'superseded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  return authLandingPath({
    profileComplete: !!(profile?.age && profile?.employment_type),
    factFindComplete: !!factFindRes.data,
    riskProfileComplete: !!riskRes.data,
    holdingsExist: !!holdingsRes.data,
    planExists: !!planRes.data,
    isAdmin: profile?.role === 'admin',
    reportEntitled: resolveEntitlements({
      subscription_tier: profile?.subscription_tier,
      trial_ends_at: profile?.trial_ends_at,
    }).canUseCharlie,
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/signup');

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  const isServerAction = request.headers.has('next-action');

  if (user && isAuthRoute && !isServerAction) {
    const landing = await landingPath(supabase, user.id);
    const explicit = request.nextUrl.searchParams.get('redirectTo');
    const explicitAllowed =
      !!explicit &&
      explicit.startsWith('/') &&
      !explicit.startsWith('//') &&
      !landing.startsWith('/onboarding') &&
      ['/dashboard', '/onboarding', '/admin'].some((prefix) => explicit.startsWith(prefix));
    const url = request.nextUrl.clone();
    url.pathname = explicitAllowed ? explicit : landing;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && isDeferredDashboardPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
