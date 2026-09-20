import { NextResponse } from "next/server";
import {
  getAuthMode,
  hasEnterpriseStripePrice,
  isClerkEnabled,
  isStripeConfigured,
} from "@/lib/authMode";

export const dynamic = "force-dynamic";

export async function GET() {
  const clerkEnabled = isClerkEnabled();
  const stripeEnabled = clerkEnabled && isStripeConfigured();
  return NextResponse.json({
    authMode: getAuthMode(),
    clerkEnabled,
    stripeEnabled,
    proCheckout: stripeEnabled,
    enterpriseCheckout: stripeEnabled && hasEnterpriseStripePrice(),
  });
}
