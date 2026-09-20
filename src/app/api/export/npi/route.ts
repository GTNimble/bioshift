import { NextRequest } from "next/server";
import { requireFeature, planAllows } from "@/lib/apiAuth";
import { CMS_CSV_NOTE, csvLines, csvResponse } from "@/lib/csv";
import { getPrescriberDetail } from "@/lib/detail";
import { getPrescriberRows } from "@/lib/data";
import {
  CONTACT_CSV_HEADERS,
  contactCsvCells,
  getCachedContact,
} from "@/lib/nppes";

export async function GET(req: NextRequest) {
  const gate = await requireFeature("list_exports");
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const npi = searchParams.get("npi");
  if (!npi) {
    return new Response(JSON.stringify({ error: "npi required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const detail = getPrescriberDetail(npi, searchParams.get("familyId"));
  if (!detail) {
    return new Response(JSON.stringify({ error: "NPI not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const includeContact = planAllows(gate.session.plan, "provider_contacts");
  const contact = includeContact ? getCachedContact(npi) : null;

  const rows = getPrescriberRows().filter((r) => r.npi === npi);
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
    if (includeContact) base.push(...contactCsvCells(contact));
    return base;
  });

  const contactNote = includeContact
    ? "\n# Contact columns from public NPPES (practice address/phone; no email in public registry). Outreach subject to TCPA."
    : "";
  const body = `${CMS_CSV_NOTE}\n# NPI export: ${detail.identity.providerName} (${npi})${contactNote}\n${csvLines(headers, data)}`;
  return csvResponse(body, `purplegap-npi-${npi}-CY2024.csv`);
}
