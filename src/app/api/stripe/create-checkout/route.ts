import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PRICE_IDS } from '@/lib/stripe/client';
import { captureAPIError } from '@/lib/sentry';
import { z } from 'zod';

const CheckoutSchema = z.object({
  tier: z.enum(['essential', 'pro', 'premium']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = CheckoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tier } = parsed.data;
    const priceId = PRICE_IDS[tier];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, alias')
      .eq('id', user.id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const sessionParams: Record<string, unknown> = {
      mode: 'subscription' as const,
      payment_method_types: ['card'] as const,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?checkout=success`,
      cancel_url: `${appUrl}/dashboard/settings?checkout=cancelled`,
      metadata: { userId: user.id },
      currency: 'cad',
    };

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0],
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    captureAPIError(error, { route: 'stripe/create-checkout' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
