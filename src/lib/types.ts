export type ProductType = "reference" | "biosimilar";

export interface DrugProduct {
  productId: string;
  name: string;
  type: ProductType;
  interchangeable: boolean;
  applicant: string;
  approvalYear: number;
}

export interface DrugFamily {
  familyId: string;
  ingredient: string;
  referenceBrand: string;
  referenceApplicant: string;
  therapeuticArea: string;
  partDRelevant: boolean;
  estAnnualPartDSpendUsd: number;
  products: DrugProduct[];
}

export interface PrescriberRow {
  id: string;
  npi: string;
  providerLastName: string;
  providerFirstName: string;
  state: string;
  specialty: string;
  familyId: string;
  productId: string;
  drugName: string;
  isBrand: boolean;
  isBiosimilar: boolean;
  Tot_Clms: number;
  Tot_Drug_Cst: number;
  Tot_Benes: number;
}

export interface Plan {
  planId: string;
  planName: string;
  pbm: string;
  preferredByFamily: Record<string, string>;
}

export interface AlertItem {
  id: string;
  type: "launch" | "conversion";
  severity: "high" | "medium" | "low";
  title: string;
  familyId: string;
  brand: string;
  biosimilars: string[];
  message: string;
  estBrandSpendUsd: number;
  publishedAt: string;
}

/** Peer cohort used for biosimilar-share comparison */
export type PeerScope = "specialty+state" | "family";

export interface Opportunity {
  npi: string;
  providerName: string;
  state: string;
  specialty: string;
  familyId: string;
  ingredient: string;
  referenceBrand: string;
  brandCost: number;
  brandClaims: number;
  biosimilarClaims: number;
  totalClaims: number;
  /** This NPI×family biosimilar claims / total claims (0–1) */
  biosimilarShare: number;
  /** Mean peer biosimilar share in cohort (0–1) */
  peerBiosimilarShare: number;
  peerScope: PeerScope;
  /**
   * Peer gap in share points as a fraction: max(0, peerShare − thisShare).
   * Display as percentage points (pp).
   */
  peerGapPp: number;
  /**
   * Illustrative opportunity $ = brandCost × peerGapPp (floored at 0).
   * Gross Part D; not net of rebates/DIR. Kept as opportunityScore for
   * backward-compatible sort/export field names.
   */
  opportunityScore: number;
  brandBenes: number;
}

/** Honesty copy shown next to Opportunity $ everywhere */
export const OPPORTUNITY_HONESTY =
  "Illustrative gross Part D opportunity; not net of rebates/DIR.";

/** FDA Purple Book monthly N/R/U (or snapshot-diff) change for a tracked family */
export type PurpleChangeType = "N" | "R" | "U";

export interface PurpleBookChange {
  id: string;
  changeType: PurpleChangeType;
  changeLabel: string;
  type: "purple_book";
  severity: "high" | "medium" | "low";
  title: string;
  familyId: string;
  ingredient: string;
  therapeuticArea?: string;
  brand: string;
  productName: string;
  properName: string;
  blaNumber: string;
  licenseType: string;
  interchangeable: boolean;
  applicant: string;
  approvalDate: string;
  interApprovalDate: string;
  message: string;
  publishedAt: string;
  source: string;
}

export interface PurpleBookInScopeProduct {
  familyId: string;
  ingredient: string;
  productName: string;
  properName: string;
  blaNumber: string;
  licenseType: string;
  interchangeable: boolean;
  applicant: string;
  approvalDate: string;
  interApprovalDate: string;
  brand: string;
}

export interface PurpleBookChangelog {
  note: string;
  source: string;
  source_url?: string;
  report_month: string;
  generated_at: string;
  mode: string;
  prior_snapshot: string | null;
  has_prior_month: boolean;
  empty_reason: string | null;
  stats: Record<string, number>;
  changes: PurpleBookChange[];
  inScopeProducts: PurpleBookInScopeProduct[];
}

