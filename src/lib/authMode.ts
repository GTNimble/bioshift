export type AuthMode = "clerk" | "demo";

function nonEmpty(value: string | undefined | null): value is string {
  return Boolean(value && value.trim());
}

/** True when both Clerk keys are present (publishable + secret). */
export function hasClerkKeys(): boolean {
  return (
    nonEmpty(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    nonEmpty(process.env.CLERK_SECRET_KEY)
  );
}

/**
 * Clerk is the primary auth when AUTH_MODE is not `demo` and keys exist.
 * Missing keys always fall back to the purplegap_session demo path.
 */
export function isClerkEnabled(): boolean {
  if (process.env.AUTH_MODE === "demo") return false;
  return hasClerkKeys();
}

export function getAuthMode(): AuthMode {
  return isClerkEnabled() ? "clerk" : "demo";
}

export function isStripeConfigured(): boolean {
  return nonEmpty(process.env.STRIPE_SECRET_KEY) && nonEmpty(process.env.STRIPE_PRICE_PRO_YEARLY);
}

export function hasEnterpriseStripePrice(): boolean {
  return nonEmpty(process.env.STRIPE_PRICE_ENTERPRISE_YEARLY);
}

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (raw || "http://localhost:3000").replace(/\/$/, "");
}

export function getStripePriceId(tier: "pro" | "enterprise"): string | undefined {
  if (tier === "pro") return process.env.STRIPE_PRICE_PRO_YEARLY?.trim() || undefined;
  return process.env.STRIPE_PRICE_ENTERPRISE_YEARLY?.trim() || undefined;
}
