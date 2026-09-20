import { NextRequest } from "next/server";
import { requireFeature } from "@/lib/apiAuth";
import { CMS_CSV_NOTE, csvLines, csvResponse } from "@/lib/csv";
import { buildMakerSharePacks } from "@/lib/makerShare";
import { PRO_EXPORT_ROW_LIMIT } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Maker competitive share CSV (brand vs biosimilar by family / state / top NPIs).
 * Pro (maker_share_pack): limited NPI rows. Enterprise full: list_exports.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wantFull =
    searchParams.get("full") === "1" || searchParams.get("scope") === "full";
  const level = searchParams.get("level") || "npi"; // family | state | npi

  const gate = await requireFeature(wantFull ? "list_exports" : "maker_share_pack");
  if (!gate.ok) return gate.response;

  const packs = buildMakerSharePacks();
  const familyId = searchParams.get("familyId");
  const filtered = familyId ? packs.filter((p) => p.familyId === familyId) : packs;
  const limited = gate.session.plan === "pro";

  const honesty =
    "\n# Maker share pack — brand vs biosimilar Part D claims mix. Illustrative opportunity $ is gross Part D; not net of rebates/DIR. For biosimilar manufacturers / BD.";

  if (level === "family") {
    const headers = [
      "family_id",
      "ingredient",
      "reference_brand",
      "reference_applicant",
      "therapeutic_area",
      "biosimilar_count",
      "brand_claims",
      "bio_claims",
      "brand_share",
      "bio_share",
      "brand_cost",
      "bio_cost",
      "opportunity_usd",
    ];
    const rows = filtered.map((p) => [
      p.familyId,
      p.ingredient,
      p.referenceBrand,
      p.referenceApplicant,
      p.therapeuticArea,
      p.biosimilarCount,
      p.brandClaims,
      p.bioClaims,
      p.brandShare.toFixed(4),
      p.bioShare.toFixed(4),
      Math.round(p.brandCost),
      Math.round(p.bioCost),
      Math.round(p.opportunityUsd),
    ]);
    const body = `${CMS_CSV_NOTE}${honesty}\n${csvLines(headers, rows)}`;
    return csvResponse(body, "purplegap-maker-share-families-CY2024.csv");
  }

  if (level === "state") {
    const headers = [
      "family_id",
      "reference_brand",
      "state",
      "brand_claims",
      "bio_claims",
      "brand_share",
      "bio_share",
      "brand_cost",
      "opportunity_usd",
    ];
    const rows: (string | number)[][] = [];
    for (const p of filtered) {
      for (const s of p.stateConcentration) {
        rows.push([
          p.familyId,
          p.referenceBrand,
          s.state,
          s.brandClaims,
          s.bioClaims,
          s.brandShare.toFixed(4),
          s.bioShare.toFixed(4),
          Math.round(s.brandCost),
          Math.round(s.opportunityUsd),
        ]);
      }
    }
    const body = `${CMS_CSV_NOTE}${honesty}\n${csvLines(headers, rows)}`;
    return csvResponse(body, "purplegap-maker-share-states-CY2024.csv");
  }

  const headers = [
    "family_id",
    "reference_brand",
    "npi",
    "provider_name",
    "state",
    "specialty",
    "brand_cost",
    "biosimilar_share",
    "peer_biosimilar_share",
    "peer_gap_pp",
    "opportunity_usd",
  ];
  let rows: (string | number)[][] = [];
  for (const p of filtered) {
    for (const n of p.topBrandHeavyNpis) {
      rows.push([
        p.familyId,
        p.referenceBrand,
        n.npi,
        n.providerName,
        n.state,
        n.specialty,
        Math.round(n.brandCost),
        n.biosimilarShare.toFixed(4),
        n.peerBiosimilarShare.toFixed(4),
        (n.peerGapPp * 100).toFixed(2),
        Math.round(n.opportunityScore),
      ]);
    }
  }
  if (limited && rows.length > PRO_EXPORT_ROW_LIMIT) {
    rows = rows.slice(0, PRO_EXPORT_ROW_LIMIT);
  }
  const limitNote = limited
    ? `\n# Pro plan: limited to top ${PRO_EXPORT_ROW_LIMIT} NPI rows. Enterprise: unlimited.`
    : "";
  const body = `${CMS_CSV_NOTE}${honesty}${limitNote}\n${csvLines(headers, rows)}`;
  return csvResponse(
    body,
    `purplegap-maker-share-npis-CY2024${limited ? "-limited" : ""}.csv`
  );
}
