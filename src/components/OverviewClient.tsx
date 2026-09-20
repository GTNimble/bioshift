"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/components/AuthProvider";
import { ExportButton } from "@/components/ExportButton";
import { PrescriberDetailPanel } from "@/components/PrescriberDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { FilterBar, FilterField, filterInputClass, filterSelectClass } from "@/components/list/FilterBar";
import { useSortableTable } from "@/hooks/useSortableTable";
import { FREE_SAMPLE_LIMIT } from "@/lib/plans";
import { formatUsd, formatPct, formatPp } from "@/lib/format";
import { OpportunityHonesty } from "@/components/OpportunityFormula";
import type { Opportunity } from "@/lib/types";

type SortKey =
  | "opportunityScore"
  | "peerGapPp"
  | "brandCost"
  | "biosimilarShare"
  | "providerName"
  | "state"
  | "specialty"
  | "referenceBrand";

export function OverviewActions() {
  const { hasFeature } = useAuth();
  if (!hasFeature("csv_export")) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Lock className="h-4 w-4 text-slate-400" />
          CSV export (Pro+)
        </Link>
        <ExportButton
          href="/api/export/opportunities?full=1"
          label="Unlimited list export"
          requireEnterprise
        />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <ExportButton />
      <ExportButton
        href="/api/export/opportunities?full=1"
        label="Unlimited list export"
        requireEnterprise
      />
    </div>
  );
}

export function TopOpportunitiesTable({ rows }: { rows: Opportunity[] }) {
  const { session, hasFeature } = useAuth();
  const isFree = session?.plan === "free";
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [selected, setSelected] = useState<{ npi: string; familyId: string } | null>(null);

  const states = useMemo(
    () => Array.from(new Set(rows.map((o) => o.state))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (state && o.state !== state) return false;
      if (!qq) return true;
      return (
        o.providerName.toLowerCase().includes(qq) ||
        o.npi.includes(qq) ||
        o.referenceBrand.toLowerCase().includes(qq) ||
        o.specialty.toLowerCase().includes(qq)
      );
    });
  }, [rows, q, state]);

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable<Opportunity, SortKey>(
    filtered,
    "opportunityScore",
    "desc"
  );

  const visible = isFree ? sorted.slice(0, FREE_SAMPLE_LIMIT) : sorted;
  const locked = isFree ? sorted.slice(FREE_SAMPLE_LIMIT) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <FilterBar>
          <FilterField label="Search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="NPI, name, brand…"
              className={filterInputClass}
            />
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
          Showing {visible.length}
          {isFree ? ` of top ${FREE_SAMPLE_LIMIT} free sample` : ` of ${sorted.length} filtered`} ·
          click a row for breakdown · click headers to sort
        </p>
      </div>

      {isFree ? (
        <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-xs font-medium text-amber-900">
          Free plan sample — showing top {FREE_SAMPLE_LIMIT} opportunities after filters. Upgrade to
          Pro for the full feed and CSV export.
        </div>
      ) : null}

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
            <SortableTh k="referenceBrand" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} textAsc>
              Brand
            </SortableTh>
            <SortableTh k="brandCost" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
              Brand cost
            </SortableTh>
            <SortableTh k="biosimilarShare" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
              Bio share
            </SortableTh>
            <th className="px-3 py-3 text-right font-semibold uppercase tracking-wide text-slate-500">
              Peer share
            </th>
            <SortableTh k="peerGapPp" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
              Peer gap
            </SortableTh>
            <SortableTh k="opportunityScore" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
              Opportunity $
            </SortableTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((o) => (
            <tr
              key={`${o.npi}-${o.familyId}`}
              className="cursor-pointer hover:bg-indigo-50/60"
              onClick={() => setSelected({ npi: o.npi, familyId: o.familyId })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected({ npi: o.npi, familyId: o.familyId });
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Open detail for ${o.providerName}`}
            >
              <td className="px-3 py-3">
                <div className="font-medium text-slate-900">{o.providerName}</div>
                <div className="font-mono text-xs text-slate-500">NPI {o.npi}</div>
              </td>
              <td className="px-3 py-3 text-slate-700">{o.state}</td>
              <td className="px-3 py-3 text-slate-700">{o.specialty}</td>
              <td className="px-3 py-3 text-slate-700">{o.referenceBrand}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatUsd(o.brandCost)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPct(o.biosimilarShare)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                {formatPct(o.peerBiosimilarShare)}
                <span className="ml-1 text-[10px] uppercase text-slate-400">
                  {o.peerScope === "family" ? "fam" : "peer"}
                </span>
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                {formatPp(o.peerGapPp)}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-indigo-700">
                {formatUsd(o.opportunityScore)}
              </td>
            </tr>
          ))}
          {visible.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-6">
                <EmptyState
                  title="No opportunities match filters"
                  description="Try clearing search or state filters."
                  icon={<SearchX className="h-5 w-5" />}
                />
              </td>
            </tr>
          ) : null}
          {locked.map((o) => (
            <tr key={`locked-${o.npi}-${o.familyId}`} className="bg-slate-50/50">
              <td className="px-3 py-3">
                <div className="blur-[3px] select-none">
                  <div className="font-medium text-slate-900">{o.providerName}</div>
                  <div className="font-mono text-xs text-slate-500">NPI {o.npi}</div>
                </div>
              </td>
              <td className="px-3 py-3 blur-[3px] select-none">{o.state}</td>
              <td className="px-3 py-3 blur-[3px] select-none">{o.specialty}</td>
              <td className="px-3 py-3 blur-[3px] select-none">{o.referenceBrand}</td>
              <td className="px-3 py-3 text-right blur-[3px] select-none">••••</td>
              <td className="px-3 py-3 text-right blur-[3px] select-none">••</td>
              <td className="px-3 py-3 text-right blur-[3px] select-none">••</td>
              <td className="px-3 py-3 text-right blur-[3px] select-none">••</td>
              <td className="px-3 py-3 text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                  <Lock className="h-3 w-3" /> Pro
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isFree && locked.length > 0 && !hasFeature("prescribers") ? (
        <div className="border-t border-slate-100 bg-white px-4 py-3 text-center text-sm text-slate-600">
          <Link href="/pricing" className="font-semibold text-indigo-600 hover:underline">
            Upgrade to Pro
          </Link>{" "}
          to unlock the remaining opportunities and full modules.
        </div>
      ) : null}

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
        <OpportunityHonesty />
      </div>

      <PrescriberDetailPanel
        open={Boolean(selected)}
        npi={selected?.npi ?? null}
        familyId={selected?.familyId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
