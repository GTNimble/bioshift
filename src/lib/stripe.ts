import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";
import { getStripePriceId } from "@/lib/authMode";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function planForStripePriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === getStripePriceId("pro")) return "pro";
  if (priceId === getStripePriceId("enterprise")) return "enterprise";
  return null;
}

export function isStripeReady(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && getStripePriceId("pro"));
}
