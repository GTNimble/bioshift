"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Layers, TrendingUp, Users } from "lucide-react";
import type { EnrollmentGroup } from "@/lib/enrollmentTypes";
import { ENROLLMENT_HONESTY } from "@/lib/enrollmentTypes";
import { formatUsd, formatNumber } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { AccountDetailPanel } from "@/components/AccountDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { FilterBar, FilterField, filterInputClass } from "@/components/list/FilterBar";
import { useSortableTable } from "@/hooks/useSortableTable";
import { ChartCard } from "@/components/ui/ChartCard";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";

type SortKey = "displayName" | "npiCount" | "totalBrandCostUsd" | "oppUsd" | "state";

function sourceBadge(source: string): string {
  switch (source) {
    case "pecos_asct_cntl_id":
      return "PECOS assoc";
    case "nppes_org":
      return "NPPES org";
    case "singleton":
      return "Singleton";
    default:
      return source;
  }
}


/** Primary Opp $ for a member: live peer-gap when enriched; else illustrative proxy. */
function memberOppUsd(m: EnrollmentGroup["npis"][number]): number {
  return m.liveOpportunityUsd ?? m.illustrativeOpportunityUsd;
}

export function AccountsClient({
  groups,
  honesty,
  updatedAt,
  initialGroupId = null,
}: {
  groups: EnrollmentGroup[];
  honesty?: string;
  updatedAt?: string;
  initialGroupId?: string | null;
}) {
  const [q, setQ] = useState("");
  const [multiOnly, setMultiOnly] = useState(false);
  const [selected, setSelected] = useState<EnrollmentGroup | null>(null);

  useEffect(() => {
    if (!initialGroupId) return;
    const hit = groups.find((g) => g.groupId === initialGroupId);
    if (hit) setSelected(hit);
  }, [initialGroupId, groups]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (multiOnly && g.npiCount < 2) return false;
      if (!qq) return true;
      return (
        g.displayName.toLowerCase().includes(qq) ||
        g.groupId.toLowerCase().includes(qq) ||
        (g.pecosAssocControlId && g.pecosAssocControlId.toLowerCase().includes(qq)) ||
        (g.state && g.state.toLowerCase().includes(qq)) ||
        g.npis.some(
          (m) =>
            m.npi.includes(qq) ||
            m.providerName.toLowerCase().includes(qq) ||
            m.state.toLowerCase().includes(qq) ||
            m.specialty.toLowerCase().includes(qq)
        )
      );
    });
  }, [groups, q, multiOnly]);

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable<EnrollmentGroup, SortKey>(
    filtered,
    "oppUsd",
    "desc",
    (row, key) => {
      if (key === "oppUsd") return row.liveOpportunityUsd ?? row.illustrativeOpportunityUsd;
      if (key === "state") return row.state ?? "";
      return row[key as keyof EnrollmentGroup] as string | number;
    }
  );

  const multi = groups.filter((g) => g.npiCount > 1).length;
  const liveTotal = groups.reduce(
    (s, g) => s + (g.liveOpportunityUsd ?? g.illustrativeOpportunityUsd),
    0
  );
  const npiCovered = groups.reduce((s, g) => s + g.npiCount, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-950">
        <p className="font-semibold">Accounts / groups (enrollment rollups)</p>
        <p className="mt-1 text-violet-900/90">{honesty || ENROLLMENT_HONESTY}</p>
        <p className="mt-1 text-xs text-violet-800">
          Source honesty: PECOS association control ID when present; otherwise NPPES organization
          name fallback or singleton provider. Not a legal-entity or TIN hierarchy.
        </p>
        {updatedAt ? (
          <p className="mt-1 text-xs text-violet-800">Updated {updatedAt.slice(0, 10)}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Groups"
          value={formatNumber(groups.length)}
          icon={<Building2 className="h-5 w-5" />}
          tone="violet"
        />
        <KpiCard
          label="Multi-NPI groups"
          value={formatNumber(multi)}
          sub="Shared PECOS association / org"
          icon={<Layers className="h-5 w-5" />}
        />
        <KpiCard
          label="NPIs covered"
          value={formatNumber(npiCovered)}
          sub="Linked in enrollment cache"
          icon={<Users className="h-5 w-5" />}
          tone="slate"
        />
        <KpiCard
          label="Live opportunity $"
          value={formatUsd(liveTotal, true)}
          sub="Sum of peer-gap Opportunity $ · gross Part D"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <ChartCard
        title="Opportunity distribution by account"
        description="Top groups by live peer-gap Opportunity $ (current sort)."
        honesty="Gross Part D · peer gap"
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <HorizontalBarChart
          data={sorted.slice(0, 10).map((g) => ({
            name:
              g.displayName.length > 20
                ? g.displayName.slice(0, 18) + "…"
                : g.displayName,
            value: g.liveOpportunityUsd ?? g.illustrativeOpportunityUsd,
          }))}
          barName="Opportunity $"
          fill="#7c3aed"
          height={300}
        />
      </ChartCard>

      <FilterBar>
        <FilterField label="Search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Group, NPI, name, specialty, state…"
            className={filterInputClass}
          />
        </FilterField>
        <label className="inline-flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Multi-NPI only
        </label>
        <div className="flex items-end pb-2">
          <Link
            href="/prescribers?hasAccount=1"
            className="text-xs font-semibold text-indigo-700 hover:underline"
          >
            View linked NPIs on Prescribers →
          </Link>
        </div>
      </FilterBar>

      <p className="text-xs text-slate-500">
        Showing {sorted.length} of {groups.length} groups. Member names shown inline — click a row for
        full roster and Part D breakdown.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <SortableTh k="displayName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} textAsc>
                  Group
                </SortableTh>
                <SortableTh k="state" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} textAsc>
                  State
                </SortableTh>
                <th className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">
                  Member NPIs
                </th>
                <SortableTh k="npiCount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
                  # NPIs
                </SortableTh>
                <SortableTh
                  k="totalBrandCostUsd"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  right
                >
                  Brand $
                </SortableTh>
                <SortableTh k="oppUsd" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right>
                  Opp $ (peer gap)
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((g) => {
                const preview = [...g.npis]
                  .sort((a, b) => memberOppUsd(b) - memberOppUsd(a))
                  .slice(0, 3);
                const extra = g.npiCount - preview.length;
                return (
                  <tr
                    key={g.groupId}
                    className={`cursor-pointer hover:bg-indigo-50/50 ${
                      selected?.groupId === g.groupId ? "bg-indigo-50" : ""
                    }`}
                    onClick={() => setSelected(g)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(g);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open account detail for ${g.displayName}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">{g.displayName}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold normal-case tracking-normal text-violet-700">
                          {sourceBadge(g.source)}
                        </span>
                        {g.pecosAssocControlId ? (
                          <span className="font-mono normal-case tracking-normal">
                            {g.pecosAssocControlId}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{g.state || "—"}</td>
                    <td className="px-3 py-2.5">
                      <ul className="space-y-1">
                        {preview.map((m) => (
                          <li key={m.npi} className="leading-tight">
                            <span className="font-medium text-slate-800">{m.providerName}</span>
                            <span className="text-xs text-slate-500">
                              {" "}
                              · {m.state} · {m.specialty}
                            </span>
                            <span className="ml-1 text-xs font-semibold tabular-nums text-indigo-700">
                              {formatUsd(memberOppUsd(m), true)}
                            </span>
                          </li>
                        ))}
                        {extra > 0 ? (
                          <li className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            +{extra} more
                          </li>
                        ) : null}
                      </ul>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{g.npiCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatUsd(g.totalBrandCostUsd, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-indigo-700">
                      {formatUsd(g.liveOpportunityUsd ?? g.illustrativeOpportunityUsd, true)}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No groups. Run{" "}
                    <code className="rounded bg-slate-100 px-1 text-xs">npm run data:enrollment</code>
                    .
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AccountDetailPanel
        open={Boolean(selected)}
        group={selected}
        honesty={honesty}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
