/** Shared NPPES contact types + pure helpers (safe for client components). */

export type NppesContact = {
  npi: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  telephone: string | null;
  fax: string | null;
  displayName: string | null;
  enumerationType: string | null;
  credential: string | null;
  refreshedAt: string;
  source: "NPPES";
};

/** Free plan: contact UI locked. Pro/Enterprise: real contact or null if unknown. */
export type ContactPayload = NppesContact | { locked: true } | null;

export function formatAddressLines(c: NppesContact): string[] {
  const lines: string[] = [];
  if (c.address1) lines.push(c.address1);
  if (c.address2) lines.push(c.address2);
  const cityLine = [c.city, c.state].filter(Boolean).join(", ");
  const withZip = [cityLine, c.postalCode].filter(Boolean).join(" ");
  if (withZip) lines.push(withZip);
  return lines;
}

export const CONTACT_CSV_HEADERS = [
  "practice_address_1",
  "practice_address_2",
  "practice_city",
  "practice_state",
  "practice_postal_code",
  "practice_phone",
  "practice_fax",
  "contact_source",
] as const;

export function contactCsvCells(c: NppesContact | null | undefined): (string | number)[] {
  if (!c) return ["", "", "", "", "", "", "", ""];
  return [
    c.address1 ?? "",
    c.address2 ?? "",
    c.city ?? "",
    c.state ?? "",
    c.postalCode ?? "",
    c.telephone ?? "",
    c.fax ?? "",
    c.source ?? "NPPES",
  ];
}
