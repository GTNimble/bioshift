"use client";

import type { PartDSpendFile } from "@/lib/partdSpendTypes";
import { PARTD_SPEND_HONESTY } from "@/lib/partdSpendTypes";

import { useMemo, useState } from "react";
import { BarChart3, Pill, Percent, DollarSign } from "lucide-react";
import { ConversionChart } from "@/components/ConversionChart";
import { FamilyDetailPanel } from "@/components/FamilyDetailPanel";
import { ExportButton } from "@/components/ExportButton";
import { FilterBar, FilterField, filterInputClass, filterSelectClass } from "@/components/list/FilterBar";
import { useSortableTable } from "@/hooks/useSortableTable";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";
import type { DrugProduct } from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { MixDonutChart } from "@/components/charts/MixDonutChart";
import { EmptyState } from "@/components/ui/EmptyState";

type FamilyStat = {
  familyId: string;
  ingredient: string;
  referenceBrand: string;
  therapeuticArea: string;
  biosimilarCount: number;
  interchangeableCount: number;
  brandClaims: number;
  bioClaims: number;
  brandCost: number;
  bioCost: number;
  biosimilarShare: number;
  conversionGap: number;
  estAnnualPartDSpendUsd: number;
  products: DrugProduct[];
};

type SortKey =
  | "referenceBrand"
  | "biosimilarShare"
  | "brandCost"
  | "biosimilarCount"
  | "estAnnualPartDSpendUsd"
  | "conversionGap";

export function DrugsClient({
  stats,
  initialFamilyId = null,
  partDSpend = null,
}: {
  stats: FamilyStat[];
  initialFamilyId?: string | null;
  partDSpend?: PartDSpendFile | null;
}) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(initialFamilyId);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [sortKeyUi, setSortKeyUi] = useState<SortKey>("brandCost");

  const areas = useMemo(
    () => Array.from(new Set(stats.map((s) => s.therapeuticArea))).sort(),
    [stats]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return stats.filter((s) => {
      if (area && s.therapeuticArea !== area) return false;
      if (!qq) return true;
      return (
        s.referenceBrand.toLowerCase().includes(qq) ||
        s.ingredient.toLowerCase().includes(qq) ||
        s.familyId.toLowerCase().includes(qq) ||
        s.products.some(
          (p) =>
            p.name.toLowerCase().includes(qq) ||
            p.applicant.toLowerCase().includes(qq)
        )
      );
    });
  }, [stats, q, area]);

  const { sorted, sortKey, sortDir, toggleSort, setSortKey, setSortDir } = useSortableTable<
    FamilyStat,
    SortKey
  >(filtered, "brandCost", "desc");

  // Keep select in sync when headers aren't used (tile view uses select)
  function onSortSelect(key: SortKey) {
    setSortKeyUi(key);
    setSortKey(key);
    setSortDir(
      key === "referenceBrand" ? "asc" : "desc"
    );
  }

  const chartData = sorted.map((s) => ({
    name: s.referenceBrand,
    brandShare: s.conversionGap,
    bioShare: s.biosimilarShare,
  }));

  const totalBrandCost = filtered.reduce((s, f) => s + f.brandCost, 0);
  const totalBrandClaims = filtered.reduce((s, f) => s + f.brandClaims, 0);
  const totalBioClaims = filtered.reduce((s, f) => s + f.bioClaims, 0);
  const claimTotal = totalBrandClaims + totalBioClaims;
  const overallBrandShare = claimTotal > 0 ? totalBrandClaims / claimTotal : 0;
  const overallBioShare = claimTotal > 0 ? totalBioClaims / claimTotal : 0;
  const avgBio =
    filtered.length > 0
      ? filtered.reduce((s, f) => s + f.biosimilarShare, 0) / filtered.length
      : 0;

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Families"
          value={formatNumber(filtered.length)}
          sub={`${stats.length} total in extract`}
          icon={<Pill className="h-5 w-5" />}
        />
        <KpiCard
          label="Brand cost (gross)"
          value={formatUsd(totalBrandCost, true)}
          sub="Filtered families · CMS Part D"
          icon={<DollarSign className="h-5 w-5" />}
          tone="slate"
        />
        <KpiCard
          label="Avg biosimilar share"
          value={formatPct(avgBio)}
          sub="Unweighted mean of filtered families"
          icon={<Percent className="h-5 w-5" />}
          tone="emerald"
        />
        <KpiCard
          label="Claims in view"
          value={formatNumber(claimTotal)}
          sub="Brand + biosimilar claims"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      {partDSpend && partDSpend.familyCount > 0 ? (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm text-sky-950">
          <p className="font-semibold">Part D national spend (market context)</p>
          <p className="mt-1 text-sky-900/80">{partDSpend.honesty || PARTD_SPEND_HONESTY}</p>
          <p className="mt-1 text-xs text-sky-800">
            CY{partDSpend.year} · {partDSpend.familyCount} families · updated{" "}
            {partDSpend.updatedAt?.slice(0, 10)}
          </p>
        </div>
      ) : null}

      <FilterBar
        hint={`Showing ${sorted.length} of ${stats.length} families · click a family card or product row for mix + top NPIs`}
      >
        <FilterField label="Search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Brand, ingredient, applicant…"
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label="Therapeutic area">
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Sort by">
          <select
            value={sortKeyUi || sortKey}
            onChange={(e) => onSortSelect(e.target.value as SortKey)}
            className={filterSelectClass}
          >
            <option value="brandCost">Brand cost (desc)</option>
            <option value="biosimilarShare">Biosimilar share</option>
            <option value="conversionGap">Conversion gap</option>
            <option value="estAnnualPartDSpendUsd">Illust. Part D spend</option>
            <option value="biosimilarCount">Biosimilar count</option>
            <option value="referenceBrand">Brand name</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Overall brand vs biosimilar"
          description="Claim mix across filtered families in view."
          honesty="Gross Part D · CMS CY2024 filtered"
          icon={<Percent className="h-4 w-4" />}
        >
          <MixDonutChart brandShare={overallBrandShare} bioShare={overallBioShare} />
        </ChartCard>
        <ChartCard
          title="Conversion gap by brand family"
          description={`Share of claims: reference brand vs biosimilars. Sorted: ${sortKey} (${sortDir}).`}
          honesty="Gross Part D · CMS CY2024 filtered"
          icon={<BarChart3 className="h-4 w-4" />}
          className="lg:col-span-2"
        >
          <ConversionChart data={chartData} />
        </ChartCard>
      </div>

      <div className="space-y-6">
        {sorted.length === 0 ? (
          <EmptyState
            title="No families match filters"
            description="Try clearing search or therapeutic area filters."
          />
        ) : null}
        {sorted.map((s) => (
          <section
            key={s.familyId}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setSelectedFamilyId(s.familyId)}
              className="flex w-full flex-col gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-4 text-left transition hover:bg-indigo-50/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {s.referenceBrand}{" "}
                  <span className="text-base font-normal text-slate-500">({s.ingredient})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {s.therapeuticArea} · {s.biosimilarCount} biosimilars · {s.interchangeableCount}{" "}
                  interchangeable · Illust. Part D spend {formatUsd(s.estAnnualPartDSpendUsd, true)}
                  {partDSpend?.families?.[s.familyId] ? (
                    <>
                      {" "}
                      · CMS Part D national{" "}
                      {formatUsd(partDSpend.families[s.familyId].totalSpendUsd, true)}
                      {partDSpend.families[s.familyId].yoySpendChange != null ? (
                        <>
                          {" "}
                          (YoY{" "}
                          {(
                            (partDSpend.families[s.familyId].yoySpendChange || 0) * 100
                          ).toFixed(1)}
                          %)
                        </>
                      ) : null}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Biosimilar share</div>
                  <div className="font-semibold text-emerald-700">{formatPct(s.biosimilarShare)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Brand cost (gross CMS)</div>
                  <div className="font-semibold text-slate-900">{formatUsd(s.brandCost, true)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Claims</div>
                  <div className="font-semibold text-slate-900">
                    {formatNumber(s.brandClaims + s.bioClaims)}
                  </div>
                </div>
              </div>
            </button>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2">
              <p className="text-xs text-slate-500">Click header or product row for family breakdown</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSort("biosimilarShare")}
                  className="text-xs text-slate-500 hover:text-indigo-600"
                >
                  Sort bio share {sortKey === "biosimilarShare" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </button>
                <ExportButton
                  href={`/api/export/family?familyId=${encodeURIComponent(s.familyId)}`}
                  label="Export family"
                  requireEnterprise
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Interchangeable</th>
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Approval yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.products.map((p) => (
                    <tr
                      key={p.productId}
                      className="cursor-pointer hover:bg-indigo-50/50"
                      onClick={() => setSelectedFamilyId(s.familyId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedFamilyId(s.familyId);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open family detail for ${s.referenceBrand}`}
                    >
                      <td className="px-5 py-2.5 font-medium text-slate-900">{p.name}</td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.type === "reference"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-slate-700">
                        {p.interchangeable ? (
                          <span className="font-medium text-emerald-700">Yes</span>
                        ) : (
                          "No"
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-slate-600">{p.applicant}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600">{p.approvalYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <FamilyDetailPanel
        open={Boolean(selectedFamilyId)}
        familyId={selectedFamilyId}
        onClose={() => setSelectedFamilyId(null)}
      />
    </div>
  );
}
