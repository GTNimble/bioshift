export type PartBRow = {
  npi: string;
  providerName: string;
  state: string;
  specialty: string;
  hcpcs: string;
  hcpcsDesc: string;
  familyId: string;
  services: number;
  benes: number;
  medicarePaymentUsd: number;
  avgPaymentUsd: number;
};

export type PartBTopNpi = {
  npi: string;
  providerName: string;
  state: string;
  specialty: string;
  totalMedicarePaymentUsd: number;
  totalServices: number;
  families: string[];
  hcpcsCodes: string[];
  lineCount: number;
};

export type PartBFile = {
  source: string;
  datasetId?: string;
  year: number;
  offlineSample?: boolean;
  note: string;
  honesty: string;
  hcpcsInScope: Record<string, string>;
  updatedAt: string;
  rowCount: number;
  npiCount: number;
  rows: PartBRow[];
  topNpis: PartBTopNpi[];
};

export const PARTB_HONESTY =
  "Medicare FFS Part B Physician & Other Practitioners PUF. HCPCS≠NDC; buy-and-bill / infused context. Not Medicare Advantage. Lagged annual; capped top-NPI extract — not a full national dump.";
