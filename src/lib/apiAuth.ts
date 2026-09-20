import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { PlanId, Session } from "@/lib/plans";
import { canAccess, parsePlanId, SESSION_COOKIE, type FeatureKey } from "@/lib/plans";
import { parseSessionJson } from "@/lib/session";
import { isClerkEnabled } from "@/lib/authMode";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(feature: FeatureKey, plan: PlanId) {
  return new Response(
    JSON.stringify({
      error: "Upgrade required",
      feature,
      plan,
      message: "This export requires a higher plan.",
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

function getDemoCookieSession(): Session | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return parseSessionJson(decodeURIComponent(raw));
  } catch {
    return parseSessionJson(raw);
  }
}

async function getClerkSession(): Promise<Session | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  if (!user) return null;
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    userId;
  return {
    email,
    plan: parsePlanId(user.publicMetadata?.plan),
  };
}

/** Accept Clerk session (plan from publicMetadata) or demo cookie when AUTH_MODE=demo / keys missing. */
export async function getApiSession(): Promise<Session | null> {
  if (isClerkEnabled()) {
    return getClerkSession();
  }
  return getDemoCookieSession();
}

export async function requireFeature(
  feature: FeatureKey
): Promise<{ ok: true; session: Session } | { ok: false; response: Response }> {
  const session = await getApiSession();
  if (!session) {
    return { ok: false, response: unauthorized() };
  }
  if (!canAccess(session.plan, feature)) {
    return { ok: false, response: forbidden(feature, session.plan) };
  }
  return { ok: true, session };
}

export function planAllows(plan: PlanId, feature: FeatureKey): boolean {
  return canAccess(plan, feature);
}


/** Enterprise API: PURPLEGAP_API_KEY (Bearer / X-API-Key) or Enterprise session. */
export async function resolveEnterpriseApiAuth(
  req: NextRequest
): Promise<{ ok: true; via: "api_key" | "session" } | { ok: false; response: Response }> {
  const expected = (process.env.PURPLEGAP_API_KEY || "").trim();
  const headerKey =
    req.headers.get("x-api-key")?.trim() ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();

  if (expected && headerKey && headerKey === expected) {
    return { ok: true, via: "api_key" };
  }

  const session = await getApiSession();
  if (!session) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Provide Enterprise session or PURPLEGAP_API_KEY (Bearer / X-API-Key).",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  if (!planAllows(session.plan, "api_feed")) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Upgrade required",
          feature: "api_feed",
          plan: session.plan,
          message: "Enterprise API requires Enterprise plan or a valid PURPLEGAP_API_KEY.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { ok: true, via: "session" };
}
