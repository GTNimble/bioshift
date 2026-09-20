/** Shared CSV helpers for export routes */

export function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvLines(headers: string[], rows: (string | number)[][]): string {
  return [
    headers.join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");
}

export const CMS_CSV_NOTE =
  "# PurpleGap export — CMS Part D Prescribers CY2024 PUF (filtered to biosimilar-relevant molecules); Tot_Drug_Cst is gross Part D cost (not net of rebates/DIR). Not a full national dump.";

export function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
