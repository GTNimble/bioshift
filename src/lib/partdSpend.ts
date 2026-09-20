import { existsSync, readFileSync } from "fs";
import path from "path";
import type { PartDSpendFile } from "@/lib/partdSpendTypes";
export type { PartDBrandSpend, PartDFamilySpend, PartDSpendFile } from "@/lib/partdSpendTypes";
export { PARTD_SPEND_HONESTY } from "@/lib/partdSpendTypes";

const REL = path.join("data", "processed", "partd_drug_spend.json");

function empty(): PartDSpendFile {
  return {
    source: "https://data.cms.gov/",
    year: 2024,
    note: "No Part D spend cache — run npm run data:partd-spend",
    honesty: "Gross Part D national spend; not net of rebates/DIR.",
    updatedAt: new Date().toISOString(),
    familyCount: 0,
    families: {},
    familyList: [],
  };
}

export function loadPartDSpend(): PartDSpendFile {
  const p = path.join(process.cwd(), REL);
  if (!existsSync(p)) return empty();
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as PartDSpendFile;
    if (!raw.families || typeof raw.families !== "object") return empty();
    return raw;
  } catch {
    return empty();
  }
}

export function getPartDFamilySpend(familyId: string) {
  return loadPartDSpend().families[familyId] ?? null;
}
