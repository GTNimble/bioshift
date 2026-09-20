import { NextRequest } from "next/server";
import { computeOpportunities } from "@/lib/data";
import { requireFeature, planAllows } from "@/lib/apiAuth";
import { CMS_CSV_NOTE, csvLines, csvResponse } from "@/lib/csv";
import { PRO_EXPORT_ROW_LIMIT } from "@/lib/plans";
import { getCachedContactsMap, formatAddressLines } from "@/lib/nppes";

export const dynamic = "force-dynamic";

/**
 * CRM-friendly opportunity CSV:
 * npi, name, state, specialty, family, opportunity_usd, peer_gap_pp, phone, address
 * Pro: limited rows. Enterprise: full (list_exports).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wantFull =
    searchParams.get("full") === "1" || searchParams.get("scope") === "full";

  const gate = await requireFeature(wantFull ? "list_exports" : "csv_export");
  if (!gate.ok) return gate.response;

  const state = searchParams.get("state");
  const specialty = searchParams.get("specialty");
  const familyId = searchParams.get("familyId");

  let opps = computeOpportunities();
  if (state) opps = opps.filter((o) => o.state === state);
  if (specialty) opps = opps.filter((o) => o.specialty === specialty);
  if (familyId) opps = opps.filter((o) => o.familyId === familyId);

  const limited = gate.session.plan === "pro";
  if (limited && opps.length > PRO_EXPORT_ROW_LIMIT) {
    opps = opps.slice(0, PRO_EXPORT_ROW_LIMIT);
  }

  const includeContact = planAllows(gate.session.plan, "provider_contacts");
  const contactMap = includeContact ? getCachedContactsMap() : {};

  const headers = [
    "npi",
    "name",
    "state",
    "specialty",
    "family",
    "reference_brand",
    "opportunity_usd",
    "peer_gap_pp",
    "phone",
    "address",
  ];

  const rows = opps.map((o) => {
    const c = contactMap[o.npi];
    const address = c ? formatAddressLines(c).join(" | ") : "";
    return [
      o.npi,
      o.providerName,
      o.state,
      o.specialty,
      o.familyId,
      o.referenceBrand,
      Math.round(o.opportunityScore),
      (o.peerGapPp * 100).toFixed(2),
      includeContact ? c?.telephone ?? "" : "",
      includeContact ? address : "",
    ];
  });

  const limitNote = limited
    ? `\n# Pro plan: limited to top ${PRO_EXPORT_ROW_LIMIT} rows. Upgrade to Enterprise for unlimited CRM export.`
    : "";
  const contactNote = includeContact
    ? "\n# phone/address from public NPPES (no email). Outreach subject to TCPA."
    : "\n# Contact columns empty — upgrade to Pro+ for NPPES phone/address.";
  const honesty =
    "\n# Illustrative Opportunity $ = brand_gross × max(0, peer_bio_share − this_bio_share). Gross Part D; not net of rebates/DIR. peer_gap_pp in percentage points.";

  const body = `${CMS_CSV_NOTE}${honesty}${limitNote}${contactNote}\n${csvLines(headers, rows)}`;
  const suffix = ["crm", "opportunities", "CY2024"];
  if (state) suffix.push(state);
  if (familyId) suffix.push(familyId);
  if (limited) suffix.push("limited");
  return csvResponse(body, `purplegap-${suffix.join("-")}.csv`);
}
