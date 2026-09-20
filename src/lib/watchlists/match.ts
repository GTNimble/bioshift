import type { Opportunity, PurpleBookChange, AlertItem } from "@/lib/types";
import type { WatchItem, Watchlist } from "./types";

export type WatchlistOpportunitySummary = {
  count: number;
  opportunitySum: number;
  top: Opportunity[];
  matched: Opportunity[];
};

/** Opportunities that touch any item on the list (family / state / npi). */
export function matchOpportunities(
  list: Watchlist,
  all: Opportunity[]
): WatchlistOpportunitySummary {
  const families = new Set(
    list.items.filter((i) => i.type === "family").map((i) => i.value)
  );
  const states = new Set(
    list.items.filter((i) => i.type === "state").map((i) => i.value.toUpperCase())
  );
  const npis = new Set(list.items.filter((i) => i.type === "npi").map((i) => i.value));

  if (families.size === 0 && states.size === 0 && npis.size === 0) {
    return { count: 0, opportunitySum: 0, top: [], matched: [] };
  }

  const matched = all.filter((o) => {
    if (npis.has(o.npi)) return true;
    if (states.has(o.state.toUpperCase())) return true;
    if (families.has(o.familyId)) return true;
    return false;
  });

  const opportunitySum = matched.reduce((s, o) => s + o.opportunityScore, 0);
  const top = [...matched].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);

  return { count: matched.length, opportunitySum, top, matched };
}

export function itemMatchesOpportunity(item: WatchItem, o: Opportunity): boolean {
  if (item.type === "family") return o.familyId === item.value;
  if (item.type === "state") return o.state.toUpperCase() === item.value.toUpperCase();
  if (item.type === "npi") return o.npi === item.value;
  return false;
}

export function purpleChangesForList(
  list: Watchlist,
  changes: PurpleBookChange[]
): PurpleBookChange[] {
  const families = new Set(
    list.items.filter((i) => i.type === "family").map((i) => i.value)
  );
  if (families.size === 0) return [];
  return changes.filter((c) => families.has(c.familyId));
}

export function launchAlertsForList(list: Watchlist, alerts: AlertItem[]): AlertItem[] {
  const families = new Set(
    list.items.filter((i) => i.type === "family").map((i) => i.value)
  );
  if (families.size === 0) return [];
  return alerts.filter((a) => families.has(a.familyId));
}
