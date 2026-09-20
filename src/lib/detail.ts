import {
  computeOpportunities,
  getFamilies,
  getFamily,
  getPrescriberRows,
  familyConversionStats,
} from "@/lib/data";
import type { DrugFamily, DrugProduct, Opportunity, PrescriberRow } from "@/lib/types";
import type { ContactPayload } from "@/lib/nppesTypes";

export type PrescriberDetail = {
  opportunity: Opportunity | null;
  identity: {
    npi: string;
    providerLastName: string;
    providerFirstName: string;
    providerName: string;
    state: string;
    specialty: string;
  };
  family: DrugFamily | null;
  /** Product-level CMS rows for this NPI × family */
  familyRows: PrescriberRow[];
  /** Aggregates for this NPI × family */
  totals: {
    Tot_Clms: number;
    Tot_Drug_Cst: number;
    Tot_Benes: number;
    brandClaims: number;
    bioClaims: number;
    brandCost: number;
    bioCost: number;
  };
  /** Other biosimilar-family opportunity rows for same NPI */
  otherOpportunities: Opportunity[];
  /** All CMS rows for this NPI across families */
  otherProductRows: PrescriberRow[];
  purpleBookBiosimilars: DrugProduct[];
  /** NPPES practice contact — locked for Free, null if unknown, else address/phone */
  contact: ContactPayload;
};

export function getPrescriberDetail(npi: string, familyId?: string | null): PrescriberDetail | null {
  const rows = getPrescriberRows().filter((r) => r.npi === npi);
  if (rows.length === 0) return null;

  const sample = rows[0];
  const opps = computeOpportunities().filter((o) => o.npi === npi);
  const opportunity =
    (familyId ? opps.find((o) => o.familyId === familyId) : undefined) ??
    opps[0] ??
    null;
  const resolvedFamilyId = familyId || opportunity?.familyId || sample.familyId;
  const family = getFamily(resolvedFamilyId) ?? null;
  const familyRows = rows.filter((r) => r.familyId === resolvedFamilyId);
  const otherProductRows = rows.filter((r) => r.familyId !== resolvedFamilyId);
  const otherOpportunities = opps.filter((o) => o.familyId !== resolvedFamilyId);

  const Tot_Clms = familyRows.reduce((s, r) => s + r.Tot_Clms, 0);
  const Tot_Drug_Cst = familyRows.reduce((s, r) => s + r.Tot_Drug_Cst, 0);
  const Tot_Benes = familyRows.reduce((s, r) => s + r.Tot_Benes, 0);
  const brandClaims = familyRows.filter((r) => r.isBrand).reduce((s, r) => s + r.Tot_Clms, 0);
  const bioClaims = familyRows.filter((r) => r.isBiosimilar).reduce((s, r) => s + r.Tot_Clms, 0);
  const brandCost = familyRows.filter((r) => r.isBrand).reduce((s, r) => s + r.Tot_Drug_Cst, 0);
  const bioCost = familyRows.filter((r) => r.isBiosimilar).reduce((s, r) => s + r.Tot_Drug_Cst, 0);

  return {
    opportunity,
    identity: {
      npi,
      providerLastName: sample.providerLastName,
      providerFirstName: sample.providerFirstName,
      providerName: `${sample.providerLastName}, ${sample.providerFirstName}`,
      state: sample.state,
      specialty: sample.specialty,
    },
    family,
    familyRows,
    totals: { Tot_Clms, Tot_Drug_Cst, Tot_Benes, brandClaims, bioClaims, brandCost, bioCost },
    otherOpportunities,
    otherProductRows,
    purpleBookBiosimilars: family?.products.filter((p) => p.type === "biosimilar") ?? [],
    contact: null,
  };
}

export type FamilyDetail = {
  family: DrugFamily;
  stats: ReturnType<typeof familyConversionStats>[number];
  productMix: {
    productId: string;
    name: string;
    type: string;
    interchangeable: boolean;
    Tot_Clms: number;
    Tot_Drug_Cst: number;
    Tot_Benes: number;
  }[];
  topOpportunities: Opportunity[];
};

export function getFamilyDetail(familyId: string): FamilyDetail | null {
  const family = getFamily(familyId);
  if (!family) return null;
  const stats = familyConversionStats().find((s) => s.familyId === familyId);
  if (!stats) return null;
  const rows = getPrescriberRows().filter((r) => r.familyId === familyId);
  const byProduct = new Map<
    string,
    { productId: string; name: string; type: string; interchangeable: boolean; Tot_Clms: number; Tot_Drug_Cst: number; Tot_Benes: number }
  >();
  for (const p of family.products) {
    byProduct.set(p.productId, {
      productId: p.productId,
      name: p.name,
      type: p.type,
      interchangeable: p.interchangeable,
      Tot_Clms: 0,
      Tot_Drug_Cst: 0,
      Tot_Benes: 0,
    });
  }
  for (const r of rows) {
    const cur = byProduct.get(r.productId);
    if (cur) {
      cur.Tot_Clms += r.Tot_Clms;
      cur.Tot_Drug_Cst += r.Tot_Drug_Cst;
      cur.Tot_Benes += r.Tot_Benes;
    } else {
      byProduct.set(r.productId, {
        productId: r.productId,
        name: r.drugName,
        type: r.isBrand ? "reference" : "biosimilar",
        interchangeable: false,
        Tot_Clms: r.Tot_Clms,
        Tot_Drug_Cst: r.Tot_Drug_Cst,
        Tot_Benes: r.Tot_Benes,
      });
    }
  }
  const topOpportunities = computeOpportunities()
    .filter((o) => o.familyId === familyId)
    .slice(0, 25);

  return {
    family,
    stats,
    productMix: Array.from(byProduct.values()).sort((a, b) => b.Tot_Drug_Cst - a.Tot_Drug_Cst),
    topOpportunities,
  };
}

export type StateDetail = {
  state: string;
  opportunity: number;
  brandCost: number;
  npiCount: number;
  oppCount: number;
  topNpis: Opportunity[];
  topFamilies: {
    familyId: string;
    referenceBrand: string;
    ingredient: string;
    opportunity: number;
    brandCost: number;
    count: number;
  }[];
};

export function getStateDetail(state: string): StateDetail | null {
  const opps = computeOpportunities().filter((o) => o.state === state);
  if (opps.length === 0) return null;

  const opportunity = opps.reduce((s, o) => s + o.opportunityScore, 0);
  const brandCost = opps.reduce((s, o) => s + o.brandCost, 0);
  const npiCount = new Set(opps.map((o) => o.npi)).size;

  const byFamily = new Map<
    string,
    { familyId: string; referenceBrand: string; ingredient: string; opportunity: number; brandCost: number; count: number }
  >();
  for (const o of opps) {
    if (!byFamily.has(o.familyId)) {
      byFamily.set(o.familyId, {
        familyId: o.familyId,
        referenceBrand: o.referenceBrand,
        ingredient: o.ingredient,
        opportunity: 0,
        brandCost: 0,
        count: 0,
      });
    }
    const f = byFamily.get(o.familyId)!;
    f.opportunity += o.opportunityScore;
    f.brandCost += o.brandCost;
    f.count += 1;
  }

  return {
    state,
    opportunity,
    brandCost,
    npiCount,
    oppCount: opps.length,
    topNpis: opps.slice(0, 25),
    topFamilies: Array.from(byFamily.values())
      .sort((a, b) => b.opportunity - a.opportunity)
      .slice(0, 16),
  };
}

export function getAllFamilies(): DrugFamily[] {
  return getFamilies();
}
