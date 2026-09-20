import { existsSync, readFileSync } from "fs";
import path from "path";
import type { PartBFile } from "@/lib/partbTypes";
export type { PartBRow, PartBTopNpi, PartBFile } from "@/lib/partbTypes";
export { PARTB_HONESTY } from "@/lib/partbTypes";

const REL = path.join("data", "processed", "partb_practitioners.json");

function empty(): PartBFile {
  return {
    source: "https://data.cms.gov/",
    year: 2023,
    note: "No Part B cache — run npm run data:partb",
    honesty: "FFS Part B only; HCPCS≠NDC; lagged annual PUF.",
    hcpcsInScope: {},
    updatedAt: new Date().toISOString(),
    rowCount: 0,
    npiCount: 0,
    rows: [],
    topNpis: [],
  };
}

export function loadPartB(): PartBFile {
  const p = path.join(process.cwd(), REL);
  if (!existsSync(p)) return empty();
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as PartBFile;
    if (!Array.isArray(raw.rows)) return empty();
    return raw;
  } catch {
    return empty();
  }
}
