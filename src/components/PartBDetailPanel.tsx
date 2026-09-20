"use client";

import { useMemo } from "react";
import type { PartBFile, PartBTopNpi } from "@/lib/partbTypes";
import { PARTB_HONESTY } from "@/lib/partbTypes";
import { formatUsd, formatNumber } from "@/lib/format";
import { DetailDrawer } from "@/components/DetailDrawer";

export function PartBDetailPanel({
  open,
  npi,
  data,
  onClose,
}: {
  open: boolean;
  npi: string | null;
  data: PartBFile;
  onClose: () => void;
}) {
  const top = useMemo(
    () => (npi ? data.topNpis.find((n) => n.npi === npi) ?? null : null),
    [data.topNpis, npi]
  );
  const lines = useMemo(
    () => (npi ? data.rows.filter((r) => r.npi === npi).sort((a, b) => b.medicarePaymentUsd - a.medicarePaymentUsd) : []),
    [data.rows, npi]
  );

  const title = top?.providerName ?? npi ?? "Part B NPI";
  const subtitle = top
    ? `NPI ${top.npi} · ${top.state} · ${top.specialty}`
    : undefined;

  return (
    <DetailDrawer open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {!top ? (
        <p className="text-sm text-slate-500">No Part B summary for this NPI.</p>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3">
            <Metric label="Medicare $" value={formatUsd(top.totalMedicarePaymentUsd)} />
            <Metric label="Services" value={formatNumber(top.totalServices)} />
            <Metric label="HCPCS lines" value={formatNumber(top.lineCount)} />
            <Metric label="Families" value={String(top.families.length)} />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Families / HCPCS
            </h3>
            <p className="text-sm text-slate-700">
              <span className="font-medium">Families:</span> {top.families.join(", ") || "—"}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-600">
              {top.hcpcsCodes.join(", ") || "—"}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              HCPCS breakdown
            </h3>
            {lines.length === 0 ? (
              <p className="text-sm text-slate-500">No line-level rows in extract for this NPI.</p>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-2">HCPCS</th>
                    <th className="py-2">Family</th>
                    <th className="py-2 text-right">Services</th>
                    <th className="py-2 text-right">Payment $</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((r) => (
                    <tr key={`${r.hcpcs}-${r.familyId}`}>
                      <td className="py-2">
                        <div className="font-mono text-xs font-medium">{r.hcpcs}</div>
                        <div className="max-w-[12rem] truncate text-[10px] text-slate-500" title={r.hcpcsDesc}>
                          {r.hcpcsDesc}
                        </div>
                      </td>
                      <td className="py-2 text-xs text-slate-600">{r.familyId}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(r.services)}</td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatUsd(r.medicarePaymentUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <p className="text-xs text-slate-500">{data.honesty || PARTB_HONESTY}</p>
        </div>
      )}
    </DetailDrawer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

/** Helper type re-export for callers that only have top NPI. */
export type { PartBTopNpi };
