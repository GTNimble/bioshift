/** Shared Open Payments types + honesty copy (safe for client components). */

export type OpenPaymentsCompany = {
  name: string;
  amountUsd: number;
};

export type OpenPaymentsProfile = {
  npi: string;
  programYear: number;
  generalTotalUsd: number;
  researchTotalUsd: number;
  ownershipTotalUsd: number;
  totalUsd: number;
  paymentRowCount: number;
  topCompanies: OpenPaymentsCompany[];
  refreshedAt: string;
  source: string;
  lagNote: string;
  score?: number;
  flags?: string[];
  topCompanyConcentration?: number;
  topCompanyName?: string | null;
  topCompanyAmountUsd?: number;
};

export type OpenPaymentsPayload = OpenPaymentsProfile | { locked: true } | null;

export const OPEN_PAYMENTS_HONESTY =
  "Public CMS Open Payments (Sunshine Act). Program years lag publication; not a full national dump — filtered to opportunity NPIs. Score/flags are heuristic prioritization labels — not compliance findings.";
