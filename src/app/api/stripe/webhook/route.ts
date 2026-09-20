import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planForStripePriceId } from "@/lib/stripe";
import { setClerkUserPlan } from "@/lib/clerkPlan";
import { parsePlanId, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function customerIdOf(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if ("deleted" in value && value.deleted) return null;
  return value.id;
}

async function resolveClerkUserId(
  stripe: Stripe,
  source: {
    metadata?: Stripe.Metadata | null;
    client_reference_id?: string | null;
    customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  }
): Promise<string | null> {
  const fromMeta = source.metadata?.clerkUserId?.trim();
  if (fromMeta) return fromMeta;
  const fromRef = source.client_reference_id?.trim();
  if (fromRef) return fromRef;

  const customerId = customerIdOf(source.customer ?? null);
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.metadata?.clerkUserId) {
      return customer.metadata.clerkUserId;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function planFromSubscription(sub: Stripe.Subscription): PlanId {
  const status = sub.status;
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    return "free";
  }
  const priceId = sub.items.data[0]?.price?.id;
  const mapped = planForStripePriceId(priceId);
  if (mapped) return mapped;
  if (sub.metadata?.plan) return parsePlanId(sub.metadata.plan);
  return "free";
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing webhook secret or signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const stripe = getStripe();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const clerkUserId = await resolveClerkUserId(stripe, session);
        if (!clerkUserId) break;
        const customerId = customerIdOf(session.customer);
        let plan: PlanId = session.metadata?.plan ? parsePlanId(session.metadata.plan) : "free";
        if (plan === "free" && session.subscription) {
          const subId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          plan = planFromSubscription(sub);
        }
        await setClerkUserPlan(clerkUserId, plan, customerId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const clerkUserId = await resolveClerkUserId(stripe, sub);
        if (!clerkUserId) break;
        const plan =
          event.type === "customer.subscription.deleted" ? "free" : planFromSubscription(sub);
        await setClerkUserPlan(clerkUserId, plan, customerIdOf(sub.customer));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
