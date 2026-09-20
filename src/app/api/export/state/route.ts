import { NextRequest } from "next/server";
import { requireFeature, planAllows } from "@/lib/apiAuth";
import { CMS_CSV_NOTE, csvLines, csvResponse } from "@/lib/csv";
import { computeOpportunities } from "@/lib/data";
import {
  CONTACT_CSV_HEADERS,
  contactCsvCells,
  getCachedContactsMap,
} from "@/lib/nppes";

export async function GET(req: NextRequest) {
  const gate = await requireFeature("list_exports");
  if (!gate.ok) return gate.response;

  const state = new URL(req.url).searchParams.get("state");
  if (!state) {
    return new Response(JSON.stringify({ error: "state required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const includeContact = planAllows(gate.session.plan, "provider_contacts");
  const contactMap = includeContact ? getCachedContactsMap() : {};
  const opps = computeOpportunities().filter((o) => o.state === state);
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
    if (includeContact) base.push(...contactCsvCells(contactMap[o.npi]));
    return base;
  });

  const contactNote = includeContact
    ? "\n# Contact columns from public NPPES (practice address/phone; no email in public registry). Outreach subject to TCPA."
    : "";
  const honestyNote = "\n# Illustrative Opportunity $ = brand_gross × max(0, peer_bio_share − this_bio_share). Gross Part D; not net of rebates/DIR. peer_gap_pp is in percentage points.";
  const body = `${CMS_CSV_NOTE}${honestyNote}\n# State export: ${state}${contactNote}\n${csvLines(headers, rows)}`;
  return csvResponse(body, `purplegap-state-${state}-CY2024.csv`);
}
