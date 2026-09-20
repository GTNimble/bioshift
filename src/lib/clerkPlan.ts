import { clerkClient } from "@clerk/nextjs/server";
import type { PlanId } from "@/lib/plans";
import { parsePlanId } from "@/lib/plans";

export async function setClerkUserPlan(
  clerkUserId: string,
  plan: PlanId,
  stripeCustomerId?: string | null
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { plan },
    ...(stripeCustomerId
      ? { privateMetadata: { stripeCustomerId } }
      : {}),
  });
}

export async function getClerkStripeCustomerId(clerkUserId: string): Promise<string | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const raw = user.privateMetadata?.stripeCustomerId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function planFromMetadata(value: unknown): PlanId {
  return parsePlanId(value);
}
