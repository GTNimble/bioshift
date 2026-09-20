import { NextRequest } from "next/server";
import { computeOpportunities } from "@/lib/data";
import { requireFeature, planAllows } from "@/lib/apiAuth";
import { CMS_CSV_NOTE, csvLines, csvResponse } from "@/lib/csv";
import { PRO_EXPORT_ROW_LIMIT } from "@/lib/plans";
import {
  CONTACT_CSV_HEADERS,
  contactCsvCells,
  getCachedContactsMap,
} from "@/lib/nppes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wantFull =
    searchParams.get("full") === "1" ||
    searchParams.get("scope") === "full" ||
    searchParams.get("scope") === "territory";

  const gate = await requireFeature(wantFull ? "list_exports" : "csv_export");
  if (!gate.ok) return gate.response;

  const state = searchParams.get("state");
  const specialty = searchParams.get("specialty");
  const familyId = searchParams.get("familyId");
  const npi = searchParams.get("npi");

  let opps = computeOpportunities();
  if (state) opps = opps.filter((o) => o.state === state);
  if (specialty) opps = opps.filter((o) => o.specialty === specialty);
  if (familyId) opps = opps.filter((o) => o.familyId === familyId);
  if (npi) opps = opps.filter((o) => o.npi === npi);

  const limited = gate.session.plan === "pro";
  if (limited && opps.length > PRO_EXPORT_ROW_LIMIT) {
    opps = opps.slice(0, PRO_EXPORT_ROW_LIMIT);
  }

  const includeContact = planAllows(gate.session.plan, "provider_contacts");
  const contactMap = includeContact ? getCachedContactsMap() : {};

  const headers = [
    "npi",
    "provider_name",
    "state",
    "specialty",
    "family_id",
    "ingredient",
    "reference_brand",
    "brand_cost",
    "brand_claims",
    "biosimilar_claims",
    "biosimilar_share",
    "peer_biosimilar_share",
    "peer_scope",
    "peer_gap_pp",
    "opportunity_usd",
    "brand_benes",
    ...(includeContact ? [...CONTACT_CSV_HEADERS] : []),
  ];

  const rows = opps.map((o) => {
    const base: (string | number)[] = [
      o.npi,
      o.providerName,
      o.state,
      o.specialty,
      o.familyId,
      o.ingredient,
      o.referenceBrand,
      Math.round(o.brandCost),
      o.brandClaims,
      o.biosimilarClaims,
      o.biosimilarShare.toFixed(4),
      o.peerBiosimilarShare.toFixed(4),
      o.peerScope,
      (o.peerGapPp * 100).toFixed(2),
      Math.round(o.opportunityScore),
      o.brandBenes,
    ];
    if (includeContact) {
      base.push(...contactCsvCells(contactMap[o.npi]));
    }
    return base;
  });

  const limitNote = limited
    ? `\n# Pro plan: limited to top ${PRO_EXPORT_ROW_LIMIT} rows by illustrative Opportunity $. Upgrade to Enterprise for unlimited list exports.`
    : "";
  const contactNote = includeContact
    ? "\n# Contact columns from public NPPES (practice address/phone; no email in public registry). Outreach subject to TCPA."
    : "";

  const honestyNote = "\n# Illustrative Opportunity $ = brand_gross × max(0, peer_bio_share − this_bio_share). Gross Part D; not net of rebates/DIR. peer_gap_pp is in percentage points.";
  const body = `${CMS_CSV_NOTE}${honestyNote}${limitNote}${contactNote}\n${csvLines(headers, rows)}`;

  const suffixParts = ["opportunities", "CY2024"];
  if (state) suffixParts.push(state);
  if (specialty) suffixParts.push(specialty.replace(/\s+/g, "-").toLowerCase());
  if (familyId) suffixParts.push(familyId);
  if (npi) suffixParts.push(`npi-${npi}`);
  if (limited) suffixParts.push("limited");

  return csvResponse(body, `purplegap-${suffixParts.join("-")}.csv`);
}
