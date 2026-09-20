export type EnrollmentNpiMember = {
  npi: string;
  providerName: string;
  state: string;
  specialty: string;
  brandCostUsd: number;
  /** Simplified enrollment-cache proxy (not peer-gap). Prefer liveOpportunityUsd in UI. */
  illustrativeOpportunityUsd: number;
  biosimilarShare: number;
  /** Live peer-gap Opportunity $ from computeOpportunities (joined at read time). */
  liveOpportunityUsd?: number;
};

export type EnrollmentGroup = {
  groupId: string;
  displayName: string;
  source: string;
  pecosAssocControlId: string | null;
  state: string | null;
  npiCount: number;
  npis: EnrollmentNpiMember[];
  totalBrandCostUsd: number;
  illustrativeOpportunityUsd: number;
  families: string[];
  liveOpportunityUsd?: number;
};

export type EnrollmentFile = {
  source: string;
  datasetId?: string;
  note: string;
  honesty: string;
  updatedAt: string;
  npiEnrollment: Record<string, unknown>;
  npiToGroupId: Record<string, string>;
  groups: Record<string, EnrollmentGroup>;
  groupList: EnrollmentGroup[];
  groupCount: number;
  npiCount: number;
};

export const ENROLLMENT_HONESTY =
  "CMS Public Provider Enrollment (PECOS-adjacent). Association control IDs are enrollment keys — not guaranteed legal entities. Many NPIs are singletons in PPE; multi-NPI groups appear when association IDs collide. Primary Opportunity $ is live peer-gap (gross Part D); enrollment JSON also stores an illustrative share-gap proxy.";

/** Lightweight NPI→group join for list views (no member arrays). */
export type EnrollmentLinkSummary = {
  groupId: string;
  displayName: string;
  source: string;
  pecosAssocControlId: string | null;
  state: string | null;
  npiCount: number;
  /** Live peer-gap Opportunity $ (group sum) when joined; else illustrative from cache */
  opportunityUsd: number;
};

export function enrollmentSourceLabel(source: string): string {
  switch (source) {
    case "pecos_asct_cntl_id":
      return "PECOS association control";
    case "nppes_org":
      return "NPPES organization (fallback)";
    case "singleton":
      return "Singleton (no shared association)";
    default:
      return source || "Enrollment";
  }
}
