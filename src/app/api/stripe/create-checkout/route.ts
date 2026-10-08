import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { priceIdForCheckout } from "@/lib/stripe/client";
import { expectedPriceCents, formatAcademyPrice, formatTierPriceCad, matchesPublishedCadAmount } from "@/lib/config/pricing";
import type { BillingInterval } from "@/lib/config/pricing";
import type Stripe from "stripe";
import { getFoundingStatus } from "@/lib/founding";
import { captureAPIError } from "@/lib/sentry";
import { z } from "zod";

function recurringMatches(price: Stripe.Price, interval: BillingInterval): boolean {
  const recurring = price.recurring?.interval;
  return interval === "annual" ? recurring === "year" : recurring === "month";
}

async function resolveCheckoutPrice(
  stripe: Stripe,
  configuredId: string,
  expected: number,
  interval: BillingInterval,
): Promise<string | null> {
  try {
    const configured = await stripe.prices.retrieve(configuredId, { expand: ["product"] });
    if (matchesPublishedCadAmount(configured, expected) && recurringMatches(configured, interval)) {
      return configured.id;
    }
    const product = configured.product;
    const productId = typeof product === "string" ? product : product && !product.deleted ? product.id : null;
    if (!productId) return null;

    const listed = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    const existing = listed.data.find(
      (price) => matchesPublishedCadAmount(price, expected) && recurringMatches(price, interval),
    );
    if (existing) return existing.id;

    const created = await stripe.prices.create({
      product: productId,
      currency: "cad",
      unit_amount: expected,
      recurring: { interval: interval === "annual" ? "year" : "month" },
    });
    return created.id;
  } catch (error) {
    // A missing or mismatched price id used to throw and become a bare 500.
    captureAPIError(error, { route: "stripe/create-checkout", step: "resolve-price" });
    return null;
  }
}

const CHECKOUT_UNAVAILABLE = "Checkout didn't open. Please try again.";

function unavailableCopy(
  tier: "progress" | "mastery" | "academy",
  interval: BillingInterval,
  founding: boolean,
): string {
  const name =
    tier === "academy" ? "Mosaic Academy" : tier === "mastery" ? "Mastery" : founding ? "Founding Progress" : "Progress";
  const when = interval === "annual" ? "annual" : "monthly";
  const price =
    tier === "academy"
      ? formatAcademyPrice(interval).replace("$", "CA$")
      : formatTierPriceCad(tier, interval, { founding });
  return `${name} ${when} isn't open in checkout right now. The price on the site is ${price}. Choose another plan, or try again later.`;
}

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

    const expected = expectedPriceCents(tier, interval, founding);
    let chargePriceId = await resolveCheckoutPrice(stripe, priceId, expected, interval);
    if (!chargePriceId) {
      // Founding and Mastery env price ids can be missing or from another Stripe mode.
      // Anchor on the sibling price so checkout still opens at the published amount.
      const anchor =
        founding
          ? priceIdForCheckout(tier, interval, { founding: false })
          : tier === "mastery"
            ? priceIdForCheckout(tier, interval === "annual" ? "monthly" : "annual")
            : undefined;
      if (anchor && anchor !== priceId) {
        chargePriceId = await resolveCheckoutPrice(stripe, anchor, expected, interval);
      }
    }
    if (!chargePriceId) {
      return NextResponse.json(
        { error: unavailableCopy(tier, interval, founding) },
        { status: 503 },
      );
    }

    if (founding) {
      try {
        const price = await stripe.prices.retrieve(chargePriceId, { expand: ["product"] });
        if (price.product && typeof price.product !== "string" && !price.product.deleted) {
          const current = price.product.name.trim();
          const desired =
            interval === "annual" ? "Founding Progress annual" : "Founding Progress";
          if (/^founding( monthly| annual)?$/i.test(current)) {
            await stripe.products.update(price.product.id, { name: desired });
          }
        }
      } catch (error) {
        captureAPIError(error, { route: "stripe/create-checkout", step: "rename-product" });
      }
    }

    const checkoutMeta = { userId: user.id, tier, interval, founding: String(founding) };
    let customerId = profile?.stripe_customer_id ?? null;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) {
          customerId = null;
        } else {
          const countryOk = existing.address?.country === "CA";
          const localeOk = existing.preferred_locales?.includes("en-CA") ?? false;
          if (!countryOk || !localeOk) {
            const address = existing.address;
            await stripe.customers.update(customerId, {
              address: {
                country: "CA",
                city: address?.city ?? undefined,
                line1: address?.line1 ?? undefined,
                line2: address?.line2 ?? undefined,
                postal_code: address?.postal_code ?? undefined,
                state: address?.state ?? undefined,
              },
              preferred_locales: ["en-CA"],
            });
          }
        }
      } catch (error) {
        // A customer id from another Stripe mode must not block checkout.
        captureAPIError(error, { route: "stripe/create-checkout", step: "load-customer" });
        customerId = null;
      }
    }
    if (!customerId && user.email) {
      const created = await stripe.customers.create({
        email: user.email,
        address: { country: "CA" },
        preferred_locales: ["en-CA"],
        metadata: { userId: user.id },
      });
      customerId = created.id;
      // stripe_customer_id is an entitlement column (migration 035): only the
      // service role may write it. A failed write must not block the session;
      // checkout.session.completed saves the id as well.
      try {
        const { createServiceClient } = await import("@/lib/supabase/service");
        const { error: profileError } = await createServiceClient()
          .from("user_profiles")
          .update({ stripe_customer_id: created.id })
          .eq("id", user.id);
        if (profileError) {
          captureAPIError(profileError, { route: "stripe/create-checkout", step: "save-customer" });
        }
      } catch (error) {
        captureAPIError(error, { route: "stripe/create-checkout", step: "save-customer" });
      }
    }

    const sessionParams: Record<string, unknown> = {
      mode: "subscription" as const,
      payment_method_types: ["card"] as const,
      line_items: [{ price: chargePriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?checkout=success`,
      cancel_url: `${appUrl}/dashboard/settings?checkout=cancelled`,
      metadata: checkoutMeta,
      subscription_data: { metadata: checkoutMeta },
      currency: "cad",
      locale: "en",
      adaptive_pricing: { enabled: false },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = user.email;
    }

    const createSession = (params: Record<string, unknown>) =>
      stripe.checkout.sessions.create(
        params as Parameters<typeof stripe.checkout.sessions.create>[0],
      );

    let session;
    try {
      session = await createSession(sessionParams);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (sessionParams.adaptive_pricing && /adaptive_pricing|unknown parameter/i.test(message)) {
        delete sessionParams.adaptive_pricing;
        session = await createSession(sessionParams);
      } else {
        throw error;
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    captureAPIError(error, { route: "stripe/create-checkout" });
    return NextResponse.json(
      { error: CHECKOUT_UNAVAILABLE },
      { status: 500 },
    );
  }
}
