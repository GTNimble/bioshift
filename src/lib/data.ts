import drugsData from "../../data/drugs.json";
import prescData from "../../data/prescribers.json";
import plansData from "../../data/plans.json";
import alertsData from "../../data/alerts.json";
import purpleChangelogData from "../../data/purple_book_changelog.json";
import metaData from "../../data/meta.json";
import type {
  DrugFamily,
  PrescriberRow,
  Plan,
  AlertItem,
  Opportunity,
  PurpleBookChangelog,
  PurpleBookChange,
} from "./types";

export type DataMeta = {
  flag?: string;
  cms_year?: number | null;
  honesty?: string[];
  molecules?: string[];
  processed_prescriber_rows?: number;
  unique_npis?: number;
  top_npis_per_family_cap?: number | null;
};

export const dataMeta = metaData as DataMeta;

export const DATA_BANNER =
  "CMS Part D Prescribers CY2024 (filtered to biosimilar-relevant molecules) + FDA Purple Book — not a full national dump";

/** @deprecated use DATA_BANNER */
export const SAMPLE_BANNER = DATA_BANNER;

export function getFamilies(): DrugFamily[] {
  return drugsData.families as DrugFamily[];
}

export function getFamily(familyId: string): DrugFamily | undefined {
  return getFamilies().find((f) => f.familyId === familyId);
}

export function getPrescriberRows(): PrescriberRow[] {
  return prescData.rows as PrescriberRow[];
}

export function getPlans(): Plan[] {
  return plansData.plans as Plan[];
}

export function getAlerts(): AlertItem[] {
  return alertsData.alerts as AlertItem[];
}

export function getPurpleChangelog(): PurpleBookChangelog {
  return purpleChangelogData as PurpleBookChangelog;
}

export function getPurpleBookChanges(): PurpleBookChange[] {
  return getPurpleChangelog().changes ?? [];
}


export function getDataMeta(): DataMeta {
  return dataMeta;
}

/**
 * Illustrative Opportunity $:
 *   brand_gross_spend × max(0, peerBiosimilarShare − thisNpiBiosimilarShare)
 * Peer biosimilar share = mean of other providers' biosimilar claim shares in the
 * same specialty+state+family when ≥3 other peers exist; else mean across other
 * providers in the same molecule family. Floored at 0. Gross Part D only.
 */
export function computeOpportunities(): Opportunity[] {
  const rows = getPrescriberRows();
  const families = getFamilies();
  const familyMap = Object.fromEntries(families.map((f) => [f.familyId, f]));

  type Key = string;
  type PeerPoint = { npi: string; share: number };
  const byProviderFamily = new Map<Key, PrescriberRow[]>();
  for (const r of rows) {
    const k = `${r.npi}::${r.familyId}`;
    if (!byProviderFamily.has(k)) byProviderFamily.set(k, []);
    byProviderFamily.get(k)!.push(r);
  }

  const peerLocal = new Map<string, PeerPoint[]>();
  const peerFamily = new Map<string, PeerPoint[]>();

  for (const [, group] of byProviderFamily) {
    const sample = group[0];
    const bio = group.filter((g) => g.isBiosimilar).reduce((s, g) => s + g.Tot_Clms, 0);
    const total = group.reduce((s, g) => s + g.Tot_Clms, 0);
    if (total <= 0) continue;
    const share = bio / total;
    const point: PeerPoint = { npi: sample.npi, share };
    const localKey = `${sample.specialty}::${sample.state}::${sample.familyId}`;
    if (!peerLocal.has(localKey)) peerLocal.set(localKey, []);
    peerLocal.get(localKey)!.push(point);
    if (!peerFamily.has(sample.familyId)) peerFamily.set(sample.familyId, []);
    peerFamily.get(sample.familyId)!.push(point);
  }

  function meanShare(peers: PeerPoint[]): number {
    if (peers.length === 0) return 0;
    return peers.reduce((s, p) => s + p.share, 0) / peers.length;
  }

  const opportunities: Opportunity[] = [];

  for (const [, group] of byProviderFamily) {
    const sample = group[0];
    const fam = familyMap[sample.familyId];
    if (!fam) continue;
    const brandCost = group.filter((g) => g.isBrand).reduce((s, g) => s + g.Tot_Drug_Cst, 0);
    const brandClaims = group.filter((g) => g.isBrand).reduce((s, g) => s + g.Tot_Clms, 0);
    const biosimilarClaims = group.filter((g) => g.isBiosimilar).reduce((s, g) => s + g.Tot_Clms, 0);
    const brandBenes = group.filter((g) => g.isBrand).reduce((s, g) => s + g.Tot_Benes, 0);
    const totalClaims = brandClaims + biosimilarClaims;
    if (brandCost <= 0 || totalClaims <= 0) continue;

    const biosimilarShare = biosimilarClaims / totalClaims;
    const localKey = `${sample.specialty}::${sample.state}::${sample.familyId}`;
    const localPeers = (peerLocal.get(localKey) ?? []).filter((p) => p.npi !== sample.npi);
    const familyPeers = (peerFamily.get(sample.familyId) ?? []).filter((p) => p.npi !== sample.npi);

    let peerBiosimilarShare: number;
    let peerScope: Opportunity["peerScope"];
    if (localPeers.length >= 3) {
      peerBiosimilarShare = meanShare(localPeers);
      peerScope = "specialty+state";
    } else {
      peerBiosimilarShare = meanShare(familyPeers);
      peerScope = "family";
    }

    const peerGapPp = Math.max(0, peerBiosimilarShare - biosimilarShare);
    const opportunityScore = Math.max(0, brandCost * peerGapPp);

    opportunities.push({
      npi: sample.npi,
      providerName: `${sample.providerLastName}, ${sample.providerFirstName}`,
      state: sample.state,
      specialty: sample.specialty,
      familyId: sample.familyId,
      ingredient: fam.ingredient,
      referenceBrand: fam.referenceBrand,
      brandCost,
      brandClaims,
      biosimilarClaims,
      totalClaims,
      biosimilarShare,
      peerBiosimilarShare,
      peerScope,
      peerGapPp,
      opportunityScore,
      brandBenes,
    });
  }

  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function getKpis() {
  const opps = computeOpportunities();
  const rows = getPrescriberRows();
  const families = getFamilies();
  const totalBrandCost = opps.reduce((s, o) => s + o.brandCost, 0);
  const totalOpportunity = opps.reduce((s, o) => s + o.opportunityScore, 0);
  const uniqueNpis = new Set(rows.map((r) => r.npi)).size;
  const avgBioShare =
    opps.length > 0
      ? opps.reduce((s, o) => s + o.biosimilarShare, 0) / opps.length
      : 0;

  const brandClaims = rows.filter((r) => r.isBrand).reduce((s, r) => s + r.Tot_Clms, 0);
  const bioClaims = rows.filter((r) => r.isBiosimilar).reduce((s, r) => s + r.Tot_Clms, 0);
  const claimTotal = brandClaims + bioClaims;
  const brandShare = claimTotal > 0 ? brandClaims / claimTotal : 0;
  const bioShare = claimTotal > 0 ? bioClaims / claimTotal : 0;

  const topStates = stateRankings()
    .slice(0, 8)
    .map((r) => ({ state: r.state, opportunity: r.opportunity }));

  const byFamily = new Map<string, { name: string; value: number }>();
  for (const o of opps) {
    const cur = byFamily.get(o.familyId);
    if (cur) cur.value += o.opportunityScore;
    else byFamily.set(o.familyId, { name: o.referenceBrand, value: o.opportunityScore });
  }
  const topFamilies = Array.from(byFamily.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return {
    familyCount: families.length,
    uniqueNpis,
    rowCount: rows.length,
    totalBrandCost,
    totalOpportunity,
    avgBioShare,
    brandShare,
    bioShare,
    topStates,
    topFamilies,
    topOpportunities: opps.slice(0, 8),
  };
}

export function stateRankings() {
  const opps = computeOpportunities();
  const byState = new Map<
    string,
    { opportunity: number; brandCost: number; npis: Set<string>; count: number }
  >();
  for (const o of opps) {
    if (!byState.has(o.state))
      byState.set(o.state, { opportunity: 0, brandCost: 0, npis: new Set(), count: 0 });
    const s = byState.get(o.state)!;
    s.opportunity += o.opportunityScore;
    s.brandCost += o.brandCost;
    s.npis.add(o.npi);
    s.count += 1;
  }
  return Array.from(byState.entries())
    .map(([state, v]) => ({
      state,
      opportunity: v.opportunity,
      brandCost: v.brandCost,
      npiCount: v.npis.size,
      oppCount: v.count,
    }))
    .sort((a, b) => b.opportunity - a.opportunity);
}

export function familyConversionStats() {
  const rows = getPrescriberRows();
  const families = getFamilies();
  return families.map((f) => {
    const fr = rows.filter((r) => r.familyId === f.familyId);
    const brandClaims = fr.filter((r) => r.isBrand).reduce((s, r) => s + r.Tot_Clms, 0);
    const bioClaims = fr.filter((r) => r.isBiosimilar).reduce((s, r) => s + r.Tot_Clms, 0);
    const brandCost = fr.filter((r) => r.isBrand).reduce((s, r) => s + r.Tot_Drug_Cst, 0);
    const bioCost = fr.filter((r) => r.isBiosimilar).reduce((s, r) => s + r.Tot_Drug_Cst, 0);
    const total = brandClaims + bioClaims;
    return {
      familyId: f.familyId,
      ingredient: f.ingredient,
      referenceBrand: f.referenceBrand,
      therapeuticArea: f.therapeuticArea,
      biosimilarCount: f.products.filter((p) => p.type === "biosimilar").length,
      interchangeableCount: f.products.filter((p) => p.interchangeable).length,
      brandClaims,
      bioClaims,
      brandCost,
      bioCost,
      biosimilarShare: total > 0 ? bioClaims / total : 0,
      conversionGap: total > 0 ? brandClaims / total : 0,
      estAnnualPartDSpendUsd: f.estAnnualPartDSpendUsd,
      products: f.products,
    };
  });
}

export function planGapAnalysis(planId: string) {
  const plan = getPlans().find((p) => p.planId === planId);
  if (!plan) return null;
  const rows = getPrescriberRows();
  const families = getFamilies();
  return families.map((f) => {
    const preferredId = plan.preferredByFamily[f.familyId];
    const preferred = f.products.find((p) => p.productId === preferredId);
    const fr = rows.filter((r) => r.familyId === f.familyId);
    const totalClaims = fr.reduce((s, r) => s + r.Tot_Clms, 0);
    const preferredClaims = fr
      .filter((r) => r.productId === preferredId)
      .reduce((s, r) => s + r.Tot_Clms, 0);
    const brandClaims = fr.filter((r) => r.isBrand).reduce((s, r) => s + r.Tot_Clms, 0);
    const otherBioClaims = fr
      .filter((r) => r.isBiosimilar && r.productId !== preferredId)
      .reduce((s, r) => s + r.Tot_Clms, 0);
    return {
      familyId: f.familyId,
      ingredient: f.ingredient,
      referenceBrand: f.referenceBrand,
      preferredName: preferred?.name ?? preferredId ?? "—",
      preferredId,
      preferredShare: totalClaims > 0 ? preferredClaims / totalClaims : 0,
      brandShare: totalClaims > 0 ? brandClaims / totalClaims : 0,
      otherBioShare: totalClaims > 0 ? otherBioClaims / totalClaims : 0,
      totalClaims,
      gapVsPreferred: totalClaims > 0 ? 1 - preferredClaims / totalClaims : 0,
    };
  });
}
