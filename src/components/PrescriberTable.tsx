"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import type { OpenPaymentsProfile } from "@/lib/openPaymentsTypes";
import type { EnrollmentLinkSummary } from "@/lib/enrollmentTypes";
import { useAuth } from "@/components/AuthProvider";
import { formatUsd, formatPct, formatPp } from "@/lib/format";
import { OpportunityFormula, OpportunityHonesty } from "@/components/OpportunityFormula";
import { ExportButton } from "@/components/ExportButton";
import { PrescriberDetailPanel } from "@/components/PrescriberDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { useSortableTable } from "@/hooks/useSortableTable";

type SortKey =
  | "opportunityScore"
  | "peerGapPp"
  | "brandCost"
  | "biosimilarShare"
  | "providerName"
  | "state"
  | "specialty";

export function PrescriberTable({
  opportunities,
  openPaymentsByNpi = null,
  enrollmentByNpi = null,
  initialGroupId = null,
  initialHasAccount = false,
}: {
  opportunities: Opportunity[];
  openPaymentsByNpi?: Record<string, OpenPaymentsProfile> | null;
  enrollmentByNpi?: Record<string, EnrollmentLinkSummary> | null;
  initialGroupId?: string | null;
  initialHasAccount?: boolean;
}) {
  const { hasFeature } = useAuth();
  const showOp = hasFeature("open_payments") && Boolean(openPaymentsByNpi);
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [hasAccountOnly, setHasAccountOnly] = useState(
    Boolean(initialHasAccount) || Boolean(initialGroupId)
  );
  const [groupFilter, setGroupFilter] = useState(initialGroupId ?? "");
  const [selected, setSelected] = useState<{ npi: string; familyId: string } | null>(null);

  const states = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.state))).sort(),
    [opportunities]
  );
  const specialties = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.specialty))).sort(),
    [opportunities]
  );
  const families = useMemo(
    () =>
      Array.from(new Map(opportunities.map((o) => [o.familyId, o.referenceBrand])).entries()).sort(
        (a, b) => a[1].localeCompare(b[1])
      ),
    [opportunities]
  );

  const linkedCount = useMemo(() => {
    if (!enrollmentByNpi) return 0;
    const npis = new Set(opportunities.map((o) => o.npi));
    let n = 0;
    for (const npi of npis) if (enrollmentByNpi[npi]) n += 1;
    return n;
  }, [opportunities, enrollmentByNpi]);

  const groupFilterLabel = useMemo(() => {
    if (!groupFilter || !enrollmentByNpi) return null;
    const hit = Object.values(enrollmentByNpi).find((e) => e.groupId === groupFilter);
    return hit?.displayName ?? groupFilter;
  }, [groupFilter, enrollmentByNpi]);

  const filteredBase = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (state && o.state !== state) return false;
      if (specialty && o.specialty !== specialty) return false;
      if (familyId && o.familyId !== familyId) return false;
      const link = enrollmentByNpi?.[o.npi];
      if (groupFilter) {
        if (!link || link.groupId !== groupFilter) return false;
      } else if (hasAccountOnly && !link) {
        return false;
      }
      if (!qq) return true;
      const accountHay = link
        ? `${link.displayName} ${link.groupId} ${link.pecosAssocControlId ?? ""}`.toLowerCase()
        : "";
      return (
        o.providerName.toLowerCase().includes(qq) ||
        o.npi.includes(qq) ||
        o.referenceBrand.toLowerCase().includes(qq) ||
        o.ingredient.toLowerCase().includes(qq) ||
        accountHay.includes(qq)
      );
    });
  }, [opportunities, q, state, specialty, familyId, hasAccountOnly, groupFilter, enrollmentByNpi]);

  const { sorted: filtered, sortKey, sortDir, toggleSort } = useSortableTable<Opportunity, SortKey>(
    filteredBase,
    "opportunityScore",
    "desc"
  );

  const exportQs = new URLSearchParams();
  if (state) exportQs.set("state", state);
  if (specialty) exportQs.set("specialty", specialty);
  if (familyId) exportQs.set("familyId", familyId);
  const qs = exportQs.toString();
  const exportHref = `/api/export/opportunities${qs ? `?${qs}` : ""}`;
  const fullExportHref = `/api/export/opportunities?full=1${qs ? `&${qs}` : ""}`;

  const textKeys: SortKey[] = ["providerName", "state", "specialty"];
  const onSort = (k: SortKey, textDefaultAsc?: boolean) =>
    toggleSort(k, textDefaultAsc ?? textKeys.includes(k));

  const colCount = (showOp ? 10 : 9) + 1; // + Account column

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-600">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="NPI, name, brand, account…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            State
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Specialty
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Molecule family
            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All families</option>
              {families.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton href={exportHref} label="Export filtered CSV" />
          <ExportButton
            href={fullExportHref}
            label="Export full list"
            requireEnterprise
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={hasAccountOnly || Boolean(groupFilter)}
            onChange={(e) => {
              setHasAccountOnly(e.target.checked);
              if (!e.target.checked) setGroupFilter("");
            }}
            className="rounded border-slate-300"
          />
          Has account link
          <span className="text-xs text-slate-500">
            ({linkedCount} NPIs linked
            {enrollmentByNpi ? ` · ${Object.keys(enrollmentByNpi).length} in cache` : ""})
          </span>
        </label>
        {groupFilter ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
            Account filter: {groupFilterLabel}
            <button
              type="button"
              className="font-semibold text-violet-600 hover:underline"
              onClick={() => {
                setGroupFilter("");
                setHasAccountOnly(false);
              }}
            >
              Clear
            </button>
            <Link href={`/accounts?group=${encodeURIComponent(groupFilter)}`} className="text-violet-700 hover:underline">
              Open account →
            </Link>
          </span>
        ) : null}
      </div>

      <OpportunityFormula className="mb-4" />

      <p className="mb-2 text-xs text-slate-500">
        Showing {filtered.length} of {opportunities.length} provider×family opportunities (CMS Part D
        CY2024 filtered). Click a row for breakdown. Account / PECOS from enrollment cache when
        present.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <SortableTh k="providerName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} textAsc>Provider</SortableTh>
                <th className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">
                  Account / PECOS
                </th>
                <SortableTh k="state" sortKey={sortKey} sortDir={sortDir} onSort={onSort} textAsc>State</SortableTh>
                <SortableTh k="specialty" sortKey={sortKey} sortDir={sortDir} onSort={onSort} textAsc>Specialty</SortableTh>
                <th className="px-3 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">
                  Brand
                </th>
                <SortableTh k="brandCost" sortKey={sortKey} sortDir={sortDir} onSort={onSort} right>
                  Brand cost
                </SortableTh>
                <SortableTh k="biosimilarShare" sortKey={sortKey} sortDir={sortDir} onSort={onSort} right>
                  Bio share
                </SortableTh>
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wide text-slate-500">
                  Peer share
                </th>
                <SortableTh k="peerGapPp" sortKey={sortKey} sortDir={sortDir} onSort={onSort} right>
                  Peer gap
                </SortableTh>
                {showOp ? (
                  <th className="px-3 py-3 text-right font-semibold uppercase tracking-wide text-slate-500">
                    OP score
                  </th>
                ) : null}
                <SortableTh k="opportunityScore" sortKey={sortKey} sortDir={sortDir} onSort={onSort} right>
                  Opportunity $
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => {
                const link = enrollmentByNpi?.[o.npi];
                return (
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
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">{o.providerName}</div>
                      <div className="font-mono text-xs text-slate-500">{o.npi}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {link ? (
                        <div>
                          <div className="max-w-[12rem] truncate font-medium text-violet-800" title={link.displayName}>
                            {link.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {link.npiCount} NPI{link.npiCount === 1 ? "" : "s"}
                            {link.pecosAssocControlId ? ` · ${link.pecosAssocControlId}` : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{o.state}</td>
                    <td className="px-3 py-2.5">{o.specialty}</td>
                    <td className="px-3 py-2.5">{o.referenceBrand}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(o.brandCost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPct(o.biosimilarShare)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {formatPct(o.peerBiosimilarShare)}
                      <span className="ml-1 text-[10px] uppercase text-slate-400">
                        {o.peerScope === "family" ? "fam" : "peer"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                      {formatPp(o.peerGapPp)}
                    </td>
                    {showOp ? (
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums text-violet-800">
                        {(() => {
                          const op = openPaymentsByNpi?.[o.npi];
                          if (!op) return <span className="text-slate-400">—</span>;
                          return (
                            <div>
                              <div className="font-semibold">{op.score != null ? op.score.toFixed(0) : "—"}</div>
                              <div className="max-w-[7rem] truncate text-[10px] text-violet-600/80" title={(op.flags || []).join(", ")}>
                                {(op.flags || []).slice(0, 2).join(", ") || op.topCompanyName || ""}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-indigo-700">
                      {formatUsd(o.opportunityScore)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-8 text-center text-slate-500">
                    No rows match filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <OpportunityHonesty className="mt-2" />

      <PrescriberDetailPanel
        open={Boolean(selected)}
        npi={selected?.npi ?? null}
        familyId={selected?.familyId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
