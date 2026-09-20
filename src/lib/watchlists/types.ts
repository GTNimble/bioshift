/** Entity kinds a buyer can pin on a watchlist */
export type WatchEntityType = "family" | "state" | "npi";

export type WatchItem = {
  id: string;
  type: WatchEntityType;
  /** familyId | state code | NPI */
  value: string;
  /** Display label (brand, state, provider name) */
  label: string;
  addedAt: string;
};

export type Watchlist = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: WatchItem[];
};

export type WatchlistBundle = {
  version: 1;
  updatedAt: string;
  lists: Watchlist[];
};

export function emptyWatchlistBundle(): WatchlistBundle {
  return { version: 1, updatedAt: new Date().toISOString(), lists: [] };
}

export function newWatchItemId(): string {
  return `wi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newWatchlistId(): string {
  return `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
