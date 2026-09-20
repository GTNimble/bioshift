import { NextRequest } from "next/server";
import { requireFeature, planAllows } from "@/lib/apiAuth";
import { CMS_CSV_NOTE, csvLines, csvResponse } from "@/lib/csv";
import { getFamilyDetail } from "@/lib/detail";
import { getPrescriberRows } from "@/lib/data";
import {
  CONTACT_CSV_HEADERS,
  contactCsvCells,
  getCachedContactsMap,
} from "@/lib/nppes";

export async function GET(req: NextRequest) {
  const gate = await requireFeature("list_exports");
  if (!gate.ok) return gate.response;

  const familyId = new URL(req.url).searchParams.get("familyId");
  if (!familyId) {
    return new Response(JSON.stringify({ error: "familyId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const detail = getFamilyDetail(familyId);
  if (!detail) {
    return new Response(JSON.stringify({ error: "Family not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const includeContact = planAllows(gate.session.plan, "provider_contacts");
  const contactMap = includeContact ? getCachedContactsMap() : {};
  const rows = getPrescriberRows().filter((r) => r.familyId === familyId);
  const headers = [
    "npi",
    "provider_last_name",
    "provider_first_name",
    "state",
    "specialty",
    "family_id",
    "product_id",
    "drug_name",
    "is_brand",
    "is_biosimilar",
    "Tot_Clms",
    "Tot_Drug_Cst",
    "Tot_Benes",
    ...(includeContact ? [...CONTACT_CSV_HEADERS] : []),
  ];

  const data = rows.map((r) => {
    const base: (string | number)[] = [
      r.npi,
      r.providerLastName,
      r.providerFirstName,
      r.state,
      r.specialty,
      r.familyId,
      r.productId,
      r.drugName,
      r.isBrand ? 1 : 0,
      r.isBiosimilar ? 1 : 0,
      r.Tot_Clms,
      Math.round(r.Tot_Drug_Cst * 100) / 100,
      r.Tot_Benes,
    ];
    if (includeContact) base.push(...contactCsvCells(contactMap[r.npi]));
    return base;
  });

  const contactNote = includeContact
    ? "\n# Contact columns from public NPPES (practice address/phone; no email in public registry). Outreach subject to TCPA."
    : "";
  const note = `${CMS_CSV_NOTE}\n# Family export: ${detail.family.referenceBrand} (${detail.family.ingredient})${contactNote}`;
  const body = `${note}\n${csvLines(headers, data)}`;
  return csvResponse(body, `purplegap-family-${familyId}-CY2024.csv`);
}
