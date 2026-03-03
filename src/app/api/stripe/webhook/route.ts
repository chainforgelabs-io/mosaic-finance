import { NextRequest, NextResponse } from 'next/server';
import { stripe, tierFromPriceId } from '@/lib/stripe/client';
import { captureAPIError } from '@/lib/sentry';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

// Use the service role client here because webhook requests are not
// authenticated as a Supabase user — they come from Stripe.
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    captureAPIError(err, { route: 'stripe/webhook', step: 'signature_verify' });
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? tierFromPriceId(priceId) : 'free';
        const isActive =
          subscription.status === 'active' ||
          subscription.status === 'trialing';

        await supabase
          .from('user_profiles')
          .update({
            subscription_tier: isActive ? tier : 'free',
            stripe_subscription_id: subscription.id,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('user_profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId = session.metadata?.userId;

        if (userId && customerId) {
          await supabase
            .from('user_profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    captureAPIError(error, {
      route: 'stripe/webhook',
      eventType: event.type,
    });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}
