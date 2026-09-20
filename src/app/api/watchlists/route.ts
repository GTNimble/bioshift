import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/apiAuth";
import { isClerkEnabled } from "@/lib/authMode";
import { canAccess } from "@/lib/plans";
import { emptyWatchlistBundle, type WatchlistBundle } from "@/lib/watchlists/types";
import { getWatchlistLimits } from "@/lib/watchlists/limits";
import {
  loadWatchlistsForSession,
  saveWatchlistsForSession,
} from "@/lib/watchlists/serverStore";

export const dynamic = "force-dynamic";

function validateBundle(raw: unknown): WatchlistBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as WatchlistBundle;
  if (b.version !== 1 || !Array.isArray(b.lists)) return null;
  return {
    version: 1,
    updatedAt: typeof b.updatedAt === "string" ? b.updatedAt : new Date().toISOString(),
    lists: b.lists.map((l) => ({
      id: String(l.id),
      name: String(l.name || "Untitled").slice(0, 80),
      createdAt: String(l.createdAt || new Date().toISOString()),
      updatedAt: String(l.updatedAt || new Date().toISOString()),
      items: Array.isArray(l.items)
        ? l.items.map((it) => ({
            id: String(it.id),
            type: it.type === "family" || it.type === "state" || it.type === "npi" ? it.type : "family",
            value: String(it.value).slice(0, 64),
            label: String(it.label || it.value).slice(0, 120),
            addedAt: String(it.addedAt || new Date().toISOString()),
          }))
        : [],
    })),
  };
}

function enforcePlanLimits(bundle: WatchlistBundle, plan: "free" | "pro" | "enterprise"): WatchlistBundle {
  const limits = getWatchlistLimits(plan);
  const lists = bundle.lists.slice(0, limits.maxLists).map((l) => ({
    ...l,
    items: l.items.slice(0, limits.maxItemsPerList),
  }));
  return { ...bundle, lists, updatedAt: new Date().toISOString() };
}

export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccess(session.plan, "watchlists")) {
    return NextResponse.json({ error: "Upgrade required", feature: "watchlists" }, { status: 403 });
  }
  const bundle = await loadWatchlistsForSession(session);
  return NextResponse.json({
    bundle,
    limits: getWatchlistLimits(session.plan),
    persistence: isClerkEnabled() ? "clerk" : "file",
  });
}

export async function PUT(req: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccess(session.plan, "watchlists")) {
    return NextResponse.json({ error: "Upgrade required", feature: "watchlists" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = validateBundle((body as { bundle?: unknown })?.bundle ?? body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid watchlist bundle" }, { status: 400 });
  }
  const limited = enforcePlanLimits(parsed, session.plan);
  const saved = await saveWatchlistsForSession(session, limited);
  return NextResponse.json({
    bundle: saved,
    limits: getWatchlistLimits(session.plan),
  });
}

export async function DELETE() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const saved = await saveWatchlistsForSession(session, emptyWatchlistBundle());
  return NextResponse.json({ bundle: saved });
}
