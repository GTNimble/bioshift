import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/apiAuth";
import { canAccess } from "@/lib/plans";
import {
  computeOpportunities,
  getAlerts,
  getPurpleBookChanges,
} from "@/lib/data";
import { buildWeeklyDigest } from "@/lib/watchlists/digest";
import { loadWatchlistsForSession } from "@/lib/watchlists/serverStore";
import type { WatchlistBundle } from "@/lib/watchlists/types";

export const dynamic = "force-dynamic";

/**
 * Weekly digest JSON for the authenticated user/session.
 * Email is NOT sent — use this payload with an ESP later (see README).
 *
 * Query: ?listId=<optional> to scope to one list.
 * Optional body: { bundle } to preview client-side lists without saving first.
 */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccess(session.plan, "watchlists")) {
    return NextResponse.json({ error: "Upgrade required", feature: "watchlists" }, { status: 403 });
  }

  const url = new URL(req.url);
  const listId = url.searchParams.get("listId");
  const bundle = await loadWatchlistsForSession(session);

  const digest = buildWeeklyDigest({
    bundle,
    opportunities: computeOpportunities(),
    purpleChanges: getPurpleBookChanges(),
    launchAlerts: getAlerts(),
    listId,
  });

  return NextResponse.json(digest);
}

export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccess(session.plan, "watchlists")) {
    return NextResponse.json({ error: "Upgrade required", feature: "watchlists" }, { status: 403 });
  }

  let body: { bundle?: WatchlistBundle; listId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body OK — fall back to stored */
  }

  const url = new URL(req.url);
  const listId = body.listId ?? url.searchParams.get("listId");
  const bundle =
    body.bundle && body.bundle.version === 1 && Array.isArray(body.bundle.lists)
      ? body.bundle
      : await loadWatchlistsForSession(session);

  const digest = buildWeeklyDigest({
    bundle,
    opportunities: computeOpportunities(),
    purpleChanges: getPurpleBookChanges(),
    launchAlerts: getAlerts(),
    listId,
  });

  return NextResponse.json(digest);
}
