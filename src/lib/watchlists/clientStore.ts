import {
  emptyWatchlistBundle,
  type WatchlistBundle,
} from "./types";

export const WATCHLISTS_STORAGE_KEY = "purplegap_watchlists";

export function readLocalWatchlists(): WatchlistBundle {
  if (typeof window === "undefined") return emptyWatchlistBundle();
  try {
    const raw = window.localStorage.getItem(WATCHLISTS_STORAGE_KEY);
    if (!raw) return emptyWatchlistBundle();
    const parsed = JSON.parse(raw) as WatchlistBundle;
    if (parsed?.version === 1 && Array.isArray(parsed.lists)) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return emptyWatchlistBundle();
}

export function writeLocalWatchlists(bundle: WatchlistBundle): void {
  if (typeof window === "undefined") return;
  const next = { ...bundle, updatedAt: new Date().toISOString(), version: 1 as const };
  window.localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(next));
}

export function clearLocalWatchlists(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WATCHLISTS_STORAGE_KEY);
}
