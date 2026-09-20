import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAppUrl, isClerkEnabled, isStripeConfigured } from "@/lib/authMode";
import { getClerkStripeCustomerId } from "@/lib/clerkPlan";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isClerkEnabled()) {
    return NextResponse.json({ error: "clerk_required" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = await getClerkStripeCustomerId(userId);
  if (!customerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/pricing`,
  });

  return NextResponse.json({ url: portal.url });
}
