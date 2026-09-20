import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getAppUrl, getStripePriceId, isClerkEnabled, isStripeConfigured } from "@/lib/authMode";
import { getClerkStripeCustomerId, setClerkUserPlan } from "@/lib/clerkPlan";
import { getStripe } from "@/lib/stripe";
import type { PlanId } from "@/lib/plans";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckoutBody = { price?: "pro" | "enterprise" };

function errMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unknown checkout error";
}

export async function POST(req: Request) {
  let priceId = "";
  try {
    if (!isClerkEnabled()) {
      return NextResponse.json(
        { error: "clerk_required", message: "Sign in with Clerk first (AUTH_MODE=clerk + keys)." },
        { status: 401 }
      );
    }
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: "billing_not_configured",
          message: "Missing STRIPE_SECRET_KEY or STRIPE_PRICE_PRO_YEARLY in .env.local (restart npm run dev).",
        },
        { status: 503 }
      );
    }

    let userId: string | null = null;
    try {
      const a = await auth();
      userId = a.userId;
    } catch (e) {
      return NextResponse.json(
        { error: "clerk_auth_failed", message: errMessage(e) },
        { status: 401 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No Clerk session. Sign in, then try Upgrade again." },
        { status: 401 }
      );
    }

    let body: CheckoutBody = {};
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      body = {};
    }

    const tier = body.price === "enterprise" ? "enterprise" : body.price === "pro" ? "pro" : null;
    if (!tier) {
      return NextResponse.json({ error: "invalid_price", message: "price must be pro or enterprise" }, { status: 400 });
    }

    priceId = getStripePriceId(tier) || "";
    if (!priceId) {
      if (tier === "enterprise") {
        return NextResponse.json({ error: "contact_sales", message: "No Enterprise price configured" }, { status: 400 });
      }
      return NextResponse.json(
        { error: "billing_not_configured", message: "STRIPE_PRICE_PRO_YEARLY is empty" },
        { status: 503 }
      );
    }

    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? undefined;

    const stripe = getStripe();
    const keyPrefix = (process.env.STRIPE_SECRET_KEY || "").trim().slice(0, 7);
    const existingCustomerId = await getClerkStripeCustomerId(userId);

    let customerId = existingCustomerId;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { clerkUserId: userId },
      });
      customerId = customer.id;
      await setClerkUserPlan(userId, (user?.publicMetadata?.plan as PlanId) || "free", customerId);
    }

    const plan: PlanId = tier;
    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: { clerkUserId: userId, plan },
      subscription_data: {
        metadata: { clerkUserId: userId, plan },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "checkout_failed", message: "Stripe returned no checkout URL", keyPrefix, priceIdPrefix: priceId.slice(0, 8) },
        { status: 500 }
      );
    }
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    const stripeMsg = errMessage(err);
    const keyPrefix = (process.env.STRIPE_SECRET_KEY || "").trim().slice(0, 7);
    console.error("[stripe/checkout]", stripeMsg, err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: stripeMsg,
        priceIdPrefix: priceId ? priceId.slice(0, 8) : undefined,
        keyPrefix,
      },
      { status: 500 }
    );
  }
}
