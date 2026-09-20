"use client";

import { useMemo, useState } from "react";
import { DollarSign, MapPinned, Users, TrendingUp } from "lucide-react";
import { StateChart } from "@/components/StateChart";
import { ExportButton } from "@/components/ExportButton";
import { StateDetailPanel } from "@/components/StateDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { FilterBar, FilterField, filterInputClass } from "@/components/list/FilterBar";
import { useSortableTable } from "@/hooks/useSortableTable";
import { formatUsd, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { EmptyState } from "@/components/ui/EmptyState";

type Ranking = {
  state: string;
  opportunity: number;
  brandCost: number;
  npiCount: number;
  oppCount: number;
};

type SortKey = "state" | "npiCount" | "brandCost" | "opportunity" | "oppCount";

export function GeographyClient({ rankings }: { rankings: Ranking[] }) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rankings;
    return rankings.filter(
      (r) => r.state.toLowerCase().includes(qq) || r.state.toLowerCase().startsWith(qq)
    );
  }, [rankings, q]);

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable<Ranking, SortKey>(
    filtered,
    "opportunity",
    "desc"
  );

  const chartData = sorted.slice(0, 12).map((r) => ({
    state: r.state,
    opportunity: r.opportunity,
  }));

  const totalOpp = rankings.reduce((s, r) => s + r.opportunity, 0);
  const totalBrand = rankings.reduce((s, r) => s + r.brandCost, 0);
  const totalNpis = rankings.reduce((s, r) => s + r.npiCount, 0);

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="States"
          value={formatNumber(rankings.length)}
          icon={<MapPinned className="h-5 w-5" />}
        />
        <KpiCard
          label="Illustrative Opportunity $"
          value={formatUsd(totalOpp, true)}
          sub="Sum across states · gross Part D"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="Brand cost (gross)"
          value={formatUsd(totalBrand, true)}
          icon={<DollarSign className="h-5 w-5" />}
          tone="slate"
        />
        <KpiCard
          label="NPIs (unique by state)"
          value={formatNumber(totalNpis)}
          sub="May double-count multi-state NPIs"
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <ExportButton label="Export opportunities (Pro limited)" href="/api/export/opportunities" />
        <ExportButton
          label="Export full opportunity list"
          href="/api/export/opportunities?full=1"
          requireEnterprise
        />
      </div>

      <FilterBar>
        <FilterField label="Search states">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="CA, TX, New…"
            className={filterInputClass}
          />
        </FilterField>
      </FilterBar>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Top states by opportunity"
          description="Illustrative Opportunity $ for the current sort / filter (top 12)."
          honesty="Gross Part D · illustrative"
          icon={<MapPinned className="h-4 w-4" />}
        >
          {chartData.length ? (
            <StateChart data={chartData} />
          ) : (
            <EmptyState title="No states match" description="Clear the search to see rankings." />
          )}
        </ChartCard>
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
          <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Showing {sorted.length} of {rankings.length} states. Click a row for top NPIs and
            families; click headers to sort. Enterprise exports unlock unlimited lists.
          </p>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">
                  #
                </th>
                <SortableTh
                  k="state"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  textAsc
                  className="!px-4"
                >
                  State
                </SortableTh>
                <SortableTh
                  k="npiCount"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  right
                  className="!px-4"
                >
                  NPIs
                </SortableTh>
                <SortableTh
                  k="brandCost"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  right
                  className="!px-4"
                >
                  Brand cost
                </SortableTh>
                <SortableTh
                  k="opportunity"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  right
                  className="!px-4"
                >
                  Opportunity
                </SortableTh>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-slate-500">
                  Export
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r, i) => (
                <tr
                  key={r.state}
                  className="cursor-pointer hover:bg-indigo-50/60"
                  onClick={() => setSelectedState(r.state)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedState(r.state);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open detail for ${r.state}`}
                >
                  <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{r.state}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(r.npiCount)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(r.brandCost)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(r.opportunity)}
                  </td>
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <ExportButton
                      href={`/api/export/state?state=${encodeURIComponent(r.state)}`}
                      label="CSV"
                      compact
                      requireEnterprise
                    />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No states match search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <StateDetailPanel
        open={Boolean(selectedState)}
        state={selectedState}
        onClose={() => setSelectedState(null)}
      />
    </div>
  );
}
