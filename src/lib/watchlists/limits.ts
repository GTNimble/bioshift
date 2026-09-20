import type { PlanId } from "@/lib/plans";

export type WatchlistLimits = {
  maxLists: number;
  maxItemsPerList: number;
};

/** Free: 1 list / 5 items. Pro+: more lists & items. */
export const WATCHLIST_LIMITS: Record<PlanId, WatchlistLimits> = {
  free: { maxLists: 1, maxItemsPerList: 5 },
  pro: { maxLists: 10, maxItemsPerList: 50 },
  enterprise: { maxLists: 25, maxItemsPerList: 200 },
};

export function getWatchlistLimits(plan: PlanId): WatchlistLimits {
  return WATCHLIST_LIMITS[plan];
}
