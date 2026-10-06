import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { priceIdForCheckout } from "@/lib/stripe/client";
import { expectedPriceCents, matchesPublishedCadAmount } from "@/lib/config/pricing";
import { getFoundingStatus } from "@/lib/founding";
import { captureAPIError } from "@/lib/sentry";
import { z } from "zod";

const CheckoutSchema = z.object({
  tier: z.enum(["progress", "mastery", "academy"]),
  interval: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = CheckoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tier, interval } = parsed.data;
    const founding =
      tier === "progress" ? (await getFoundingStatus()).open : false;
    const priceId = priceIdForCheckout(tier, interval, { founding });

    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid subscription tier or interval" },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, alias")
      .eq("id", user.id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { stripe } = await import("@/lib/stripe/client");

    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const expected = expectedPriceCents(tier, interval, founding);
    if (!matchesPublishedCadAmount(price, expected)) {
      return NextResponse.json(
        {
          error:
            "This plan isn't available to purchase right now. The price on the site is the price you should be charged.",
        },
        { status: 503 },
      );
    }

    if (
      founding &&
      price.product &&
      typeof price.product !== "string" &&
      !price.product.deleted
    ) {
      const current = price.product.name.trim();
      const desired =
        interval === "annual" ? "Founding Progress annual" : "Founding Progress";
      if (/^founding( monthly| annual)?$/i.test(current)) {
        await stripe.products.update(price.product.id, { name: desired });
      }
    }

    const sessionParams: Record<string, unknown> = {
      mode: "subscription" as const,
      payment_method_types: ["card"] as const,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?checkout=success`,
      cancel_url: `${appUrl}/dashboard/settings?checkout=cancelled`,
      metadata: { userId: user.id, tier, interval, founding: String(founding) },
      currency: "cad",
      adaptive_pricing: { enabled: false },
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
    captureAPIError(error, { route: "stripe/create-checkout" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
