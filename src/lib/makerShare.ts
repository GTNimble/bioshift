import {
  computeOpportunities,
  familyConversionStats,
  getFamilies,
  getPrescriberRows,
} from "@/lib/data";
import { OPPORTUNITY_HONESTY } from "@/lib/types";

export type MakerShareStateRow = {
  state: string;
  brandClaims: number;
  bioClaims: number;
  brandCost: number;
  bioCost: number;
  brandShare: number;
  bioShare: number;
  opportunityUsd: number;
};

export type MakerShareTopNpi = {
  npi: string;
  providerName: string;
  state: string;
  specialty: string;
  brandCost: number;
  biosimilarShare: number;
  peerBiosimilarShare: number;
  peerGapPp: number;
  opportunityScore: number;
};

export type MakerShareFamilyPack = {
  familyId: string;
  ingredient: string;
  referenceBrand: string;
  therapeuticArea: string;
  referenceApplicant: string;
  biosimilarCount: number;
  brandClaims: number;
  bioClaims: number;
  brandCost: number;
  bioCost: number;
  /** Brand claims / (brand+bio) — Part D gross claims mix */
  brandShare: number;
  /** Biosimilar claims / (brand+bio) */
  bioShare: number;
  /** Sum of illustrative opportunity $ for this family */
  opportunityUsd: number;
  topBrandHeavyNpis: MakerShareTopNpi[];
  stateConcentration: MakerShareStateRow[];
  honesty: string;
};

/**
 * Maker-facing competitive share pack: brand vs biosimilar Part D mix by family,
 * top brand-heavy NPIs, illustrative opportunity $, and state concentration.
 * Pitched at biosimilar manufacturers (ex-US entering US). Gross Part D only.
 */
export function buildMakerSharePacks(): MakerShareFamilyPack[] {
  const families = getFamilies();
  const stats = familyConversionStats();
  const statsById = Object.fromEntries(stats.map((s) => [s.familyId, s]));
  const opps = computeOpportunities();
  const rows = getPrescriberRows();

  return families
    .map((f) => {
      const st = statsById[f.familyId];
      const brandClaims = st?.brandClaims ?? 0;
      const bioClaims = st?.bioClaims ?? 0;
      const brandCost = st?.brandCost ?? 0;
      const bioCost = st?.bioCost ?? 0;
      const totalClaims = brandClaims + bioClaims;
      const brandShare = totalClaims > 0 ? brandClaims / totalClaims : 0;
      const bioShare = totalClaims > 0 ? bioClaims / totalClaims : 0;

      const familyOpps = opps.filter((o) => o.familyId === f.familyId);
      const opportunityUsd = familyOpps.reduce((s, o) => s + o.opportunityScore, 0);
      const topBrandHeavyNpis: MakerShareTopNpi[] = [...familyOpps]
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, 15)
        .map((o) => ({
          npi: o.npi,
          providerName: o.providerName,
          state: o.state,
          specialty: o.specialty,
          brandCost: o.brandCost,
          biosimilarShare: o.biosimilarShare,
          peerBiosimilarShare: o.peerBiosimilarShare,
          peerGapPp: o.peerGapPp,
          opportunityScore: o.opportunityScore,
        }));

      const byState = new Map<
        string,
        { brandClaims: number; bioClaims: number; brandCost: number; bioCost: number; opportunityUsd: number }
      >();
      for (const r of rows.filter((x) => x.familyId === f.familyId)) {
        const cur = byState.get(r.state) ?? {
          brandClaims: 0,
          bioClaims: 0,
          brandCost: 0,
          bioCost: 0,
          opportunityUsd: 0,
        };
        if (r.isBrand) {
          cur.brandClaims += r.Tot_Clms;
          cur.brandCost += r.Tot_Drug_Cst;
        } else if (r.isBiosimilar) {
          cur.bioClaims += r.Tot_Clms;
          cur.bioCost += r.Tot_Drug_Cst;
        }
        byState.set(r.state, cur);
      }
      for (const o of familyOpps) {
        const cur = byState.get(o.state);
        if (cur) cur.opportunityUsd += o.opportunityScore;
      }

      const stateConcentration: MakerShareStateRow[] = Array.from(byState.entries())
        .map(([state, v]) => {
          const t = v.brandClaims + v.bioClaims;
          return {
            state,
            brandClaims: v.brandClaims,
            bioClaims: v.bioClaims,
            brandCost: v.brandCost,
            bioCost: v.bioCost,
            brandShare: t > 0 ? v.brandClaims / t : 0,
            bioShare: t > 0 ? v.bioClaims / t : 0,
            opportunityUsd: v.opportunityUsd,
          };
        })
        .sort((a, b) => b.brandCost - a.brandCost)
        .slice(0, 20);

      return {
        familyId: f.familyId,
        ingredient: f.ingredient,
        referenceBrand: f.referenceBrand,
        therapeuticArea: f.therapeuticArea,
        referenceApplicant: f.referenceApplicant,
        biosimilarCount: f.products.filter((p) => p.type === "biosimilar").length,
        brandClaims,
        bioClaims,
        brandCost,
        bioCost,
        brandShare,
        bioShare,
        opportunityUsd,
        topBrandHeavyNpis,
        stateConcentration,
        honesty: OPPORTUNITY_HONESTY,
      };
    })
    .sort((a, b) => b.opportunityUsd - a.opportunityUsd);
}

export function getMakerSharePack(familyId: string): MakerShareFamilyPack | null {
  return buildMakerSharePacks().find((p) => p.familyId === familyId) ?? null;
}
