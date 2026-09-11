import { NextRequest, NextResponse } from "next/server";
import { notifySkool, priceMetaFromPriceId, stripe } from "@/lib/stripe/client";
import { captureAPIError } from "@/lib/sentry";
import { sendSubscriptionConfirmedEmail } from "@/lib/resend/client";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
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
    captureAPIError(err, { route: "stripe/webhook", step: "signature_verify" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const meta = priceId ? priceMetaFromPriceId(priceId) : null;
        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        const periodEnd = subscription.items.data[0]
          ? (subscription as Stripe.Subscription & { current_period_end?: number })
              .current_period_end
          : undefined;
        const periodEndIso =
          typeof periodEnd === "number"
            ? new Date(periodEnd * 1000).toISOString()
            : null;

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, academy_access, stripe_subscription_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!profile) break;

        const update: Record<string, unknown> = {
          subscription_status: subscription.status,
          current_period_end: periodEndIso,
        };

        if (meta?.kind === "academy") {
          update.academy_access = isActive;
        } else if (meta && isActive) {
          update.subscription_tier = meta.tier;
          update.subscription_interval = meta.interval;
          update.stripe_subscription_id = subscription.id;
          if (meta.founding) update.is_founding_member = true;
          if (meta.academy || (meta.tier === "mastery" && meta.interval === "annual")) {
            update.academy_access = true;
          }
        } else if (!isActive) {
          update.subscription_tier = "pulse";
        }

        await supabase.from("user_profiles").update(update).eq("id", profile.id);

        if (event.type === "customer.subscription.created" && isActive && meta) {
          const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
          const email = authData.user?.email;
          if (email) {
            await sendSubscriptionConfirmedEmail(email, meta.tier);
            if (meta.tier === "mastery") {
              await notifySkool(email, "club");
            }
            if (meta.academy) {
              await notifySkool(email, "academy");
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const meta = priceId ? priceMetaFromPriceId(priceId) : null;

        if (meta?.kind === "academy") {
          await supabase
            .from("user_profiles")
            .update({ academy_access: false })
            .eq("stripe_customer_id", customerId);
        } else {
          await supabase
            .from("user_profiles")
            .update({
              subscription_tier: "pulse",
              stripe_subscription_id: null,
              subscription_status: "canceled",
              subscription_interval: null,
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId = session.metadata?.userId;

        if (userId && customerId) {
          await supabase
            .from("user_profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    captureAPIError(error, {
      route: "stripe/webhook",
      eventType: event.type,
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
