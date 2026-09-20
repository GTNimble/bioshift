import type { Opportunity, PurpleBookChange, AlertItem } from "@/lib/types";
import { OPPORTUNITY_HONESTY } from "@/lib/types";
import type { Watchlist, WatchlistBundle } from "./types";
import {
  launchAlertsForList,
  matchOpportunities,
  purpleChangesForList,
} from "./match";

export type DigestPeerGapHighlight = {
  npi: string;
  providerName: string;
  state: string;
  specialty: string;
  familyId: string;
  referenceBrand: string;
  peerGapPp: number;
  opportunityScore: number;
  peerScope: Opportunity["peerScope"];
};

export type WatchlistDigestSection = {
  listId: string;
  listName: string;
  itemCount: number;
  opportunityCount: number;
  opportunitySum: number;
  topOpportunities: Array<{
    npi: string;
    providerName: string;
    state: string;
    familyId: string;
    referenceBrand: string;
    opportunityScore: number;
    peerGapPp: number;
  }>;
  peerGapHighlights: DigestPeerGapHighlight[];
  purpleBookAlerts: Array<{
    id: string;
    title: string;
    familyId: string;
    changeType: string;
    publishedAt: string;
    severity: string;
  }>;
  launchAlerts: Array<{
    id: string;
    title: string;
    familyId: string;
    type: string;
    publishedAt: string;
    severity: string;
  }>;
};

export type WeeklyDigest = {
  generatedAt: string;
  weekOf: string;
  honesty: string;
  emailPathNote: string;
  sections: WatchlistDigestSection[];
  totals: {
    lists: number;
    items: number;
    opportunityCount: number;
    opportunitySum: number;
    purpleAlertCount: number;
  };
};

const EMAIL_PATH_NOTE =
  "Email delivery is not enabled in this MVP. Wire a cron (e.g. weekly) to GET /api/digest (authenticated) or npm run digest:preview, then hand the JSON to your ESP (SendGrid/Resend/etc.). Do not send PHI; this digest is illustrative aggregate intel only.";

function startOfWeekIso(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export function buildWeeklyDigest(input: {
  bundle: WatchlistBundle;
  opportunities: Opportunity[];
  purpleChanges: PurpleBookChange[];
  launchAlerts: AlertItem[];
  listId?: string | null;
}): WeeklyDigest {
  const lists = input.listId
    ? input.bundle.lists.filter((l) => l.id === input.listId)
    : input.bundle.lists;

  const sections = lists.map((list) => buildSection(list, input));

  const totals = {
    lists: sections.length,
    items: lists.reduce((s, l) => s + l.items.length, 0),
    opportunityCount: sections.reduce((s, sec) => s + sec.opportunityCount, 0),
    opportunitySum: sections.reduce((s, sec) => s + sec.opportunitySum, 0),
    purpleAlertCount: sections.reduce((s, sec) => s + sec.purpleBookAlerts.length, 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    weekOf: startOfWeekIso(),
    honesty: OPPORTUNITY_HONESTY,
    emailPathNote: EMAIL_PATH_NOTE,
    sections,
    totals,
  };
}

function buildSection(
  list: Watchlist,
  input: {
    opportunities: Opportunity[];
    purpleChanges: PurpleBookChange[];
    launchAlerts: AlertItem[];
  }
): WatchlistDigestSection {
  const summary = matchOpportunities(list, input.opportunities);
  const peerGapHighlights = [...summary.matched]
    .filter((o) => o.peerGapPp > 0)
    .sort((a, b) => b.peerGapPp - a.peerGapPp || b.opportunityScore - a.opportunityScore)
    .slice(0, 5)
    .map((o) => ({
      npi: o.npi,
      providerName: o.providerName,
      state: o.state,
      specialty: o.specialty,
      familyId: o.familyId,
      referenceBrand: o.referenceBrand,
      peerGapPp: o.peerGapPp,
      opportunityScore: o.opportunityScore,
      peerScope: o.peerScope,
    }));

  const purple = purpleChangesForList(list, input.purpleChanges)
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      title: c.title,
      familyId: c.familyId,
      changeType: c.changeType,
      publishedAt: c.publishedAt,
      severity: c.severity,
    }));

  const launches = launchAlertsForList(list, input.launchAlerts)
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title,
      familyId: a.familyId,
      type: a.type,
      publishedAt: a.publishedAt,
      severity: a.severity,
    }));

  return {
    listId: list.id,
    listName: list.name,
    itemCount: list.items.length,
    opportunityCount: summary.count,
    opportunitySum: summary.opportunitySum,
    topOpportunities: summary.top.slice(0, 5).map((o) => ({
      npi: o.npi,
      providerName: o.providerName,
      state: o.state,
      familyId: o.familyId,
      referenceBrand: o.referenceBrand,
      opportunityScore: o.opportunityScore,
      peerGapPp: o.peerGapPp,
    })),
    peerGapHighlights,
    purpleBookAlerts: purple,
    launchAlerts: launches,
  };
}
