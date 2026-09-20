"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Plan } from "@/lib/types";
import { PlanGapChart } from "@/components/PlanGapChart";
import { ExportButton } from "@/components/ExportButton";
import { EnterpriseGate } from "@/components/PlanGate";
import { useAuth } from "@/components/AuthProvider";
import { formatPct, formatNumber } from "@/lib/format";
import { Check, Package, Database, Users, Lock, Sparkles } from "lucide-react";
import { FamilyDetailPanel } from "@/components/FamilyDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { useSortableTable } from "@/hooks/useSortableTable";
import { FilterBar, FilterField, filterInputClass } from "@/components/list/FilterBar";

type GapRow = {
  familyId: string;
  ingredient: string;
  referenceBrand: string;
  preferredName: string;
  preferredShare: number;
  brandShare: number;
  otherBioShare: number;
  totalClaims: number;
  gapVsPreferred: number;
};

export function MonetizeClient({
  plans,
  gapsByPlan,
  states,
  specialties,
  families = [],
}: {
  plans: Plan[];
  gapsByPlan: Record<string, GapRow[]>;
  states: string[];
  specialties: string[];
  families?: { familyId: string; referenceBrand: string }[];
}) {
  const { session, hasFeature } = useAuth();
  const [planId, setPlanId] = useState(plans[0]?.planId ?? "");
  const [packState, setPackState] = useState(states[0] ?? "");
  const [packSpecialty, setPackSpecialty] = useState("");
  const [packFamilyId, setPackFamilyId] = useState("");
  const [gapQ, setGapQ] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  const gaps = useMemo(() => gapsByPlan[planId] ?? [], [gapsByPlan, planId]);
  const filteredGaps = useMemo(() => {
    const qq = gapQ.trim().toLowerCase();
    if (!qq) return gaps;
    return gaps.filter(
      (g) =>
        g.referenceBrand.toLowerCase().includes(qq) ||
        g.preferredName.toLowerCase().includes(qq) ||
        g.ingredient.toLowerCase().includes(qq) ||
        g.familyId.toLowerCase().includes(qq)
    );
  }, [gaps, gapQ]);
  type GapSortKey =
    | "referenceBrand"
    | "preferredShare"
    | "brandShare"
    | "gapVsPreferred"
    | "totalClaims";
  const gapSort = useSortableTable<GapRow, GapSortKey>(filteredGaps, "gapVsPreferred", "desc");
  const chartData = useMemo(
    () =>
      gapSort.sorted.map((g) => ({
        name: g.referenceBrand,
        preferredShare: g.preferredShare,
        brandShare: g.brandShare,
        otherBioShare: g.otherBioShare,
      })),
    [gapSort.sorted]
  );

  const packQs = new URLSearchParams();
  if (packState) packQs.set("state", packState);
  if (packSpecialty) packQs.set("specialty", packSpecialty);
  if (packFamilyId) packQs.set("familyId", packFamilyId);
  const packHref = `/api/export/opportunities?${packQs.toString()}`;
  const packFullHref = `/api/export/opportunities?${packQs.toString()}&scope=territory`;

  const territoryLimited = session?.plan === "pro";
  const canTerritory = hasFeature("territory_packs");

  const tiers = [
    {
      name: "Seat license",
      price: "$2,500",
      period: "/seat/mo",
      icon: Users,
      blurb: "Analyst / formulary seat with opportunity feed & alerts UI.",
      features: ["Opportunity feed", "Drug family explorer", "Launch alerts", "CSV export (fair use)"],
    },
    {
      name: "Data feed",
      price: "$18,000",
      period: "/mo",
      icon: Database,
      blurb: "Programmatic NPI×molecule Opportunity $ and peer gap for PBM analytics.",
      features: ["Nightly delta files", "API access (planned)", "Peer-share model", "SLA support"],
      highlight: true,
    },
    {
      name: "Custom territory packs",
      price: "$4,500",
      period: "/pack",
      icon: Package,
      blurb: "State + specialty filtered NPI lists for account / field teams.",
      features: ["Filter builder", "One-time or quarterly", "Brand vs bio flags", "Ready for CRM load"],
    },
  ];

  return (
    <div className="space-y-10">
      {/* Opportunity feed */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. Opportunity feed</h2>
        <p className="mt-1 text-sm text-slate-600">
          NPI lists of high brand / low biosimilar prescribers. Export CSV for CRM or field targeting.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ExportButton label="Download opportunity feed CSV" />
          <ExportButton
            href="/api/export/crm"
            label="Download CRM CSV"
          />
          <ExportButton
            href="/api/export/crm?full=1"
            label="Unlimited CRM CSV"
            requireEnterprise
          />
          <ExportButton
            href="/api/export/opportunities?full=1"
            label="Unlimited list export"
            requireEnterprise
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Pro: limited CSV (top rows). Enterprise: unlimited list exports (opportunity, territory, family, NPI).
        </p>
      </section>

      {/* Plan gap — Enterprise */}
      <EnterpriseGate
        feature="plan_gap"
        title="Plan–prescribing gap is Enterprise"
        description="Compare sample formulary preferred biosimilar vs actual mix. Included on Enterprise; Pro users see this locked preview."
      >
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">2. Plan–prescribing gap</h2>
              <p className="mt-1 text-sm text-slate-600">
                Stub comparing demo formulary preferred biosimilar vs actual prescribing mix in the CMS-filtered feed.
              </p>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Sample plan
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="mt-1 block w-full min-w-[220px] rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {plans.map((p) => (
                  <option key={p.planId} value={p.planId}>
                    {p.planName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {plans.find((p) => p.planId === planId)?.pbm} · Sample formulary preferences only
          </p>
          <div className="mt-4">
            <PlanGapChart data={chartData} />
          </div>
          <div className="mt-4">
            <FilterBar>
              <FilterField label="Search families">
                <input
                  value={gapQ}
                  onChange={(e) => setGapQ(e.target.value)}
                  placeholder="Brand, preferred…"
                  className={filterInputClass}
                />
              </FilterField>
            </FilterBar>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs">
                <tr>
                  <SortableTh
                    k="referenceBrand"
                    sortKey={gapSort.sortKey}
                    sortDir={gapSort.sortDir}
                    onSort={gapSort.toggleSort}
                    textAsc
                  >
                    Family
                  </SortableTh>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                    Preferred
                  </th>
                  <SortableTh
                    k="preferredShare"
                    sortKey={gapSort.sortKey}
                    sortDir={gapSort.sortDir}
                    onSort={gapSort.toggleSort}
                    right
                  >
                    Preferred share
                  </SortableTh>
                  <SortableTh
                    k="brandShare"
                    sortKey={gapSort.sortKey}
                    sortDir={gapSort.sortDir}
                    onSort={gapSort.toggleSort}
                    right
                  >
                    Brand share
                  </SortableTh>
                  <SortableTh
                    k="gapVsPreferred"
                    sortKey={gapSort.sortKey}
                    sortDir={gapSort.sortDir}
                    onSort={gapSort.toggleSort}
                    right
                  >
                    Gap
                  </SortableTh>
                  <SortableTh
                    k="totalClaims"
                    sortKey={gapSort.sortKey}
                    sortDir={gapSort.sortDir}
                    onSort={gapSort.toggleSort}
                    right
                  >
                    Claims
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gapSort.sorted.map((g) => (
                  <tr
                    key={g.familyId}
                    className="cursor-pointer hover:bg-indigo-50/60"
                    onClick={() => setSelectedFamilyId(g.familyId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedFamilyId(g.familyId);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open family detail for ${g.referenceBrand}`}
                  >
                    <td className="px-3 py-2 font-medium">{g.referenceBrand}</td>
                    <td className="px-3 py-2 text-emerald-700">{g.preferredName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPct(g.preferredShare)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPct(g.brandShare)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                      {formatPct(g.gapVsPreferred)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(g.totalClaims)}</td>
                  </tr>
                ))}
                {gapSort.sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No families match search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">Click a row for family breakdown.</p>
          </div>
        </section>
      </EnterpriseGate>

      <FamilyDetailPanel
        open={Boolean(selectedFamilyId)}
        familyId={selectedFamilyId}
        onClose={() => setSelectedFamilyId(null)}
      />

      {/* Launch alerts CTA */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">3. Launch alerts</h2>
            <p className="mt-1 text-sm text-slate-600">
              Monitor new biosimilars against high Part D spend brands. See the{" "}
              <a href="/alerts" className="font-medium text-indigo-600 hover:underline">
                Alerts
              </a>{" "}
              module for the CMS-filtered feed.
            </p>
          </div>
          {hasFeature("priority_alerts") ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Priority alerts enabled
            </span>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
            >
              <Lock className="h-3.5 w-3.5" /> Priority alerts · Enterprise
            </Link>
          )}
        </div>
      </section>

      {/* Territory packs */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">4. Territory packs</h2>
        <p className="mt-1 text-sm text-slate-600">
          State / specialty / family filtered opportunity exports for account managers and specialty pharmacy outreach. Unlimited list exports (opportunity, territory, family, NPI) are Enterprise.
          {territoryLimited
            ? " Pro includes limited packs (demo: one state filter at a time)."
            : null}
        </p>
        {canTerritory ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-slate-600">
              State
              <select
                value={packState}
                onChange={(e) => setPackState(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Specialty (optional)
              <select
                value={packSpecialty}
                onChange={(e) => setPackSpecialty(e.target.value)}
                disabled={territoryLimited}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">All specialties</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {territoryLimited ? (
                <span className="mt-1 block text-[11px] text-amber-700">
                  Specialty filter unlocks on Enterprise
                </span>
              ) : null}
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Family (optional)
              <select
                value={packFamilyId}
                onChange={(e) => setPackFamilyId(e.target.value)}
                disabled={territoryLimited}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">All families</option>
                {families.map((f) => (
                  <option key={f.familyId} value={f.familyId}>
                    {f.referenceBrand}
                  </option>
                ))}
              </select>
              {territoryLimited ? (
                <span className="mt-1 block text-[11px] text-amber-700">
                  Family filter unlocks on Enterprise
                </span>
              ) : null}
            </label>
            <div className="flex flex-col items-stretch gap-2 sm:col-span-2 lg:col-span-1 sm:items-end">
              <ExportButton
                href={packHref}
                label="Export territory pack (Pro limited)"
                requireEnterprise={false}
              />
              <ExportButton
                href={packFullHref}
                label="Unlimited territory pack"
                requireEnterprise
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Territory packs require Pro or higher.{" "}
            <Link href="/pricing" className="font-medium text-indigo-600 hover:underline">
              Upgrade
            </Link>
          </div>
        )}
      </section>

      {/* API feed + multi-seat — Enterprise stubs */}
      <EnterpriseGate
        feature="api_feed"
        title="API feed & multi-seat are Enterprise"
        description="Programmatic Opportunity $ / peer gap and multi-seat management stubs are available on Enterprise."
      >
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Enterprise API</h2>
            <p className="mt-1 text-sm text-slate-600">
              Live JSON opportunities feed for CRM / warehouse sync. Auth with{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">PURPLEGAP_API_KEY</code> or an
              Enterprise session.
            </p>
            <div className="mt-4 rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
              GET /api/v1/opportunities?state=TX&amp;limit=100
              <br />
              Authorization: Bearer $PURPLEGAP_API_KEY
              <br />
              <span className="text-slate-400"># or X-API-Key: $PURPLEGAP_API_KEY</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Filters: state, familyId, specialty, minOpportunity, limit, offset. Free/Pro receive 403.
              See README for demo key pattern.
            </p>
            <div className="mt-3">
              <a
                href="/makers"
                className="text-sm font-medium text-indigo-700 hover:underline"
              >
                Maker share packs →
              </a>
            </div>
            <div className="mt-3">
              <ExportButton
                href="/api/export/opportunities"
                label="Full monetize export CSV"
                requireEnterprise
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Multi-seat management (stub)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Invite formulary analysts and account managers under one Enterprise contract.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                "demo.admin@pbm.example — Admin",
                "formulary.lead@pbm.example — Analyst",
                "field.east@pbm.example — Territory",
              ].map((row) => (
                <li
                  key={row}
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  {row}
                  <span className="text-xs font-medium text-emerald-700">Active</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </EnterpriseGate>

      {/* Pricing */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900">5. Pricing (illustrative)</h2>
        <p className="mt-1 text-sm text-slate-600">
          SaaS seats + data feed + custom packs. Prices are demo placeholders for buyer conversations — not binding quotes.
          Prefer the freemium matrix on{" "}
          <Link href="/pricing" className="font-medium text-indigo-600 hover:underline">
            /pricing
          </Link>
          .
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {tiers.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className={`rounded-xl border p-6 shadow-sm ${
                  t.highlight
                    ? "border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 text-indigo-600">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{t.name}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-900">{t.price}</span>
                  <span className="text-sm text-slate-500">{t.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{t.blurb}</p>
                <ul className="mt-4 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
