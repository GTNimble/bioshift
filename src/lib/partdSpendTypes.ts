export type PartDBrandSpend = {
  brandName: string;
  genericName: string;
  spendUsd: number;
  claims: number;
  benes: number;
  manufacturer: string;
  priorYearSpendUsd: number | null;
  yoySpendChange: number | null;
};

export type PartDFamilySpend = {
  familyId: string;
  ingredient: string;
  referenceBrandHint: string;
  totalSpendUsd: number;
  totalClaims: number;
  totalBenes: number;
  priorYearSpendUsd: number | null;
  yoySpendChange: number | null;
  brandCount: number;
  brands: PartDBrandSpend[];
};

export type PartDSpendFile = {
  source: string;
  datasetId?: string;
  year: number;
  offlineSample?: boolean;
  note: string;
  honesty: string;
  updatedAt: string;
  familyCount: number;
  families: Record<string, PartDFamilySpend>;
  familyList: PartDFamilySpend[];
};

export const PARTD_SPEND_HONESTY =
  "CMS Medicare Part D Spending by Drug — gross national spend (not net of rebates/DIR). Market context only; lagged annual release.";
