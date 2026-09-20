import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/authMode";
import type { Session } from "@/lib/plans";
import {
  emptyWatchlistBundle,
  type WatchlistBundle,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "user_watchlists");

function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}

function filePathForEmail(email: string): string {
  return path.join(DATA_DIR, `${emailKey(email)}.json`);
}

function parseBundle(raw: unknown): WatchlistBundle {
  if (
    raw &&
    typeof raw === "object" &&
    (raw as WatchlistBundle).version === 1 &&
    Array.isArray((raw as WatchlistBundle).lists)
  ) {
    return raw as WatchlistBundle;
  }
  return emptyWatchlistBundle();
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadFileBundle(email: string): Promise<WatchlistBundle> {
  try {
    const raw = await fs.readFile(filePathForEmail(email), "utf8");
    return parseBundle(JSON.parse(raw));
  } catch {
    return emptyWatchlistBundle();
  }
}

async function saveFileBundle(email: string, bundle: WatchlistBundle): Promise<void> {
  await ensureDir();
  const next: WatchlistBundle = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lists: bundle.lists,
  };
  await fs.writeFile(filePathForEmail(email), JSON.stringify(next, null, 2), "utf8");
}

async function loadClerkBundle(): Promise<WatchlistBundle> {
  const user = await currentUser();
  if (!user) return emptyWatchlistBundle();
  return parseBundle(user.publicMetadata?.watchlists);
}

async function saveClerkBundle(bundle: WatchlistBundle): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  const next: WatchlistBundle = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lists: bundle.lists,
  };
  const client = await clerkClient();
  await client.users.updateUserMetadata(user.id, {
    publicMetadata: { watchlists: next },
  });
}

/** Load watchlists for the current session (Clerk metadata or file-backed demo). */
export async function loadWatchlistsForSession(session: Session): Promise<WatchlistBundle> {
  if (isClerkEnabled()) {
    return loadClerkBundle();
  }
  return loadFileBundle(session.email);
}

/** Persist watchlists for the current session. */
export async function saveWatchlistsForSession(
  session: Session,
  bundle: WatchlistBundle
): Promise<WatchlistBundle> {
  const next: WatchlistBundle = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lists: bundle.lists ?? [],
  };
  if (isClerkEnabled()) {
    await saveClerkBundle(next);
  } else {
    await saveFileBundle(session.email, next);
  }
  return next;
}
