"use client";

import { useMemo, useState } from "react";
import { DollarSign, Hash, Syringe, Users } from "lucide-react";
import type { PartBFile, PartBTopNpi } from "@/lib/partbTypes";
import { PARTB_HONESTY } from "@/lib/partbTypes";
import { formatUsd, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { PartBDetailPanel } from "@/components/PartBDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { FilterBar, FilterField, filterInputClass, filterSelectClass } from "@/components/list/FilterBar";
import { useSortableTable } from "@/hooks/useSortableTable";
import { ChartCard } from "@/components/ui/ChartCard";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";

type SortKey =
  | "providerName"
  | "state"
  | "specialty"
  | "totalServices"
  | "totalMedicarePaymentUsd";

export function PartBClient({ data }: { data: PartBFile }) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");
  const [state, setState] = useState("");
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);

  const families = useMemo(
    () => Array.from(new Set(data.topNpis.flatMap((n) => n.families))).sort(),
    [data.topNpis]
  );
  const states = useMemo(
    () => Array.from(new Set(data.topNpis.map((n) => n.state).filter(Boolean))).sort(),
    [data.topNpis]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.topNpis.filter((n) => {
      if (family && !n.families.includes(family)) return false;
      if (state && n.state !== state) return false;
      if (!qq) return true;
      return (
        n.providerName.toLowerCase().includes(qq) ||
        n.npi.includes(qq) ||
        n.specialty.toLowerCase().includes(qq) ||
        n.hcpcsCodes.some((c) => c.toLowerCase().includes(qq)) ||
        n.families.some((f) => f.toLowerCase().includes(qq))
      );
    });
  }, [data.topNpis, q, family, state]);

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable<PartBTopNpi, SortKey>(
    filtered,
    "totalMedicarePaymentUsd",
    "desc"
  );

  const totalPay = data.topNpis.reduce((s, n) => s + n.totalMedicarePaymentUsd, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
        <p className="font-semibold">Part B buy-and-bill / infused context</p>
        <p className="mt-1 text-amber-900/90">{data.honesty || PARTB_HONESTY}</p>
        <p className="mt-1 text-xs text-amber-800">
          CY{data.year}
          {data.offlineSample ? " · offline sample" : ""} · {formatNumber(data.rowCount)} HCPCS×NPI
          rows · {formatNumber(data.npiCount)} NPIs · updated {data.updatedAt?.slice(0, 10)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="NPIs in extract"
          value={formatNumber(data.npiCount)}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="HCPCS×NPI rows"
          value={formatNumber(data.rowCount)}
          icon={<Hash className="h-5 w-5" />}
          tone="slate"
        />
        <KpiCard
          label="Top-NPI Medicare $"
          value={formatUsd(totalPay, true)}
          sub="Sum of capped extract · gross Part B"
          icon={<DollarSign className="h-5 w-5" />}
          tone="amber"
        />
        <KpiCard
          label="HCPCS in scope"
          value={formatNumber(Object.keys(data.hcpcsInScope || {}).length)}
          icon={<Syringe className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <ChartCard
        title="Top NPIs by Medicare payment"
        description="Highest Part B Medicare payment dollars in the current filtered set (top 10)."
        honesty="Gross Part B · capped extract"
        icon={<DollarSign className="h-4 w-4" />}
        className="mb-2"
      >
        <HorizontalBarChart
          data={sorted.slice(0, 10).map((n) => ({
            name: n.providerName.length > 18 ? n.providerName.slice(0, 16) + "…" : n.providerName,
            value: n.totalMedicarePaymentUsd,
          }))}
          barName="Medicare $"
          fill="#d97706"
          height={300}
        />
      </ChartCard>

      <FilterBar>
        <FilterField label="Search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="NPI, name, HCPCS…"
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label="Family">
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">All families</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="State">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <p className="text-xs text-slate-500">
        Showing {sorted.length} of {data.topNpis.length} high Part B biologic-related NPIs. Click a
        row for HCPCS breakdown.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <SortableTh k="providerName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} textAsc>
                  Provider
                </SortableTh>
                <SortableTh k="state" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} textAsc>
                  State
                </SortableTh>
                <SortableTh k="specialty" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} textAsc>
                  Specialty
                </SortableTh>
                <th className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">
                  Families
                </th>
                <th className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">
                  HCPCS
                </th>
                <SortableTh k="totalServices" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
                  Services
                </SortableTh>
                <SortableTh
                  k="totalMedicarePaymentUsd"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  right
                >
                  Medicare $
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((n: PartBTopNpi) => (
                <tr
                  key={n.npi}
                  className="cursor-pointer hover:bg-indigo-50/60"
                  onClick={() => setSelectedNpi(n.npi)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedNpi(n.npi);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open Part B detail for ${n.providerName}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{n.providerName}</div>
                    <div className="font-mono text-xs text-slate-500">{n.npi}</div>
                  </td>
                  <td className="px-3 py-2.5">{n.state}</td>
                  <td className="px-3 py-2.5">{n.specialty}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{n.families.join(", ")}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{n.hcpcsCodes.join(", ")}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(n.totalServices)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(n.totalMedicarePaymentUsd)}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No rows match filters. Refresh with{" "}
                    <code className="rounded bg-slate-100 px-1 text-xs">npm run data:partb</code>.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <PartBDetailPanel
        open={Boolean(selectedNpi)}
        npi={selectedNpi}
        data={data}
        onClose={() => setSelectedNpi(null)}
      />
    </div>
  );
}
