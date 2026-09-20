"use client";

import type { PartDSpendFile } from "@/lib/partdSpendTypes";
import { PARTD_SPEND_HONESTY } from "@/lib/partdSpendTypes";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MakerShareFamilyPack, MakerShareTopNpi, MakerShareStateRow } from "@/lib/makerShare";
import { ExportButton } from "@/components/ExportButton";
import { useAuth } from "@/components/AuthProvider";
import { formatUsd, formatPct, formatNumber, formatPp } from "@/lib/format";
import { Factory, MapPin, Users, PieChart as PieIcon, BarChart3 } from "lucide-react";
import { ChartCard } from "@/components/ui/ChartCard";
import { MixDonutChart } from "@/components/charts/MixDonutChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { KpiCard } from "@/components/KpiCard";
import { PrescriberDetailPanel } from "@/components/PrescriberDetailPanel";
import { StateDetailPanel } from "@/components/StateDetailPanel";
import { FamilyDetailPanel } from "@/components/FamilyDetailPanel";
import { SortableTh } from "@/components/list/SortableTh";
import { FilterBar, FilterField, filterInputClass } from "@/components/list/FilterBar";
import { useSortableTable } from "@/hooks/useSortableTable";

type NpiSortKey =
  | "providerName"
  | "state"
  | "brandCost"
  | "biosimilarShare"
  | "peerGapPp"
  | "opportunityScore";

type StateSortKey =
  | "state"
  | "brandClaims"
  | "bioClaims"
  | "brandShare"
  | "brandCost"
  | "opportunityUsd";

export function MakerShareClient({
  packs,
  partDSpend = null,
}: {
  packs: MakerShareFamilyPack[];
  partDSpend?: PartDSpendFile | null;
}) {
  const { hasFeature, session } = useAuth();
  const [familyId, setFamilyId] = useState(packs[0]?.familyId ?? "");
  const [npiQ, setNpiQ] = useState("");
  const [stateQ, setStateQ] = useState("");
  const [selectedNpi, setSelectedNpi] = useState<{ npi: string; familyId: string } | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [familyDetailOpen, setFamilyDetailOpen] = useState(false);

  const pack = useMemo(
    () => packs.find((p) => p.familyId === familyId) ?? packs[0] ?? null,
    [packs, familyId]
  );

  const canCsv = hasFeature("maker_share_pack") || hasFeature("csv_export");
  const canFull = hasFeature("list_exports");

  const filteredNpis = useMemo(() => {
    if (!pack) return [];
    const qq = npiQ.trim().toLowerCase();
    if (!qq) return pack.topBrandHeavyNpis;
    return pack.topBrandHeavyNpis.filter(
      (n) =>
        n.providerName.toLowerCase().includes(qq) ||
        n.npi.includes(qq) ||
        n.state.toLowerCase().includes(qq) ||
        n.specialty.toLowerCase().includes(qq)
    );
  }, [pack, npiQ]);

  const filteredStates = useMemo(() => {
    if (!pack) return [];
    const qq = stateQ.trim().toLowerCase();
    if (!qq) return pack.stateConcentration;
    return pack.stateConcentration.filter((s) => s.state.toLowerCase().includes(qq));
  }, [pack, stateQ]);

  const npiSort = useSortableTable<MakerShareTopNpi, NpiSortKey>(
    filteredNpis,
    "opportunityScore",
    "desc"
  );
  const stateSort = useSortableTable<MakerShareStateRow, StateSortKey>(
    filteredStates,
    "opportunityUsd",
    "desc"
  );

  if (!pack) {
    return <p className="text-sm text-slate-600">No family packs available.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 text-sm text-violet-950">
        <div className="flex items-start gap-2">
          <Factory className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Built for manufacturers / BD</p>
            <p className="mt-1 text-violet-900/80">
              Use this pack to see where reference brands still dominate Part D claims, which NPIs are
              brand-heavy vs peers, and which states concentrate remaining brand cost. Figures are{" "}
              <span className="font-medium">gross Part D</span> — not net of rebates/DIR.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-medium text-slate-600">
          Drug family
          <select
            value={pack.familyId}
            onChange={(e) => {
              setFamilyId(e.target.value);
              setNpiQ("");
              setStateQ("");
            }}
            className="mt-1 block min-w-[240px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {packs.map((p) => (
              <option key={p.familyId} value={p.familyId}>
                {p.referenceBrand} ({p.ingredient})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setFamilyDetailOpen(true)}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          Family detail
        </button>
        <div className="flex flex-wrap gap-2">
          <ExportButton
            href={`/api/export/maker-share?level=family`}
            label="Export family CSV"
            requireEnterprise={false}
          />
          <ExportButton
            href={`/api/export/maker-share?level=npi&familyId=${encodeURIComponent(pack.familyId)}`}
            label="Export NPI CSV (Pro limited)"
          />
          <ExportButton
            href={`/api/export/maker-share?level=npi&familyId=${encodeURIComponent(pack.familyId)}&full=1`}
            label="Unlimited NPI CSV"
            requireEnterprise
          />
          <ExportButton
            href={`/api/export/maker-share?level=state&familyId=${encodeURIComponent(pack.familyId)}`}
            label="Export state CSV"
            requireEnterprise={!canCsv}
          />
        </div>
      </div>

      {!canFull && session?.plan === "pro" ? (
        <p className="text-xs text-amber-700">
          Pro exports are row-capped.{" "}
          <Link href="/pricing" className="font-semibold underline">
            Enterprise
          </Link>{" "}
          unlocks unlimited maker / CRM exports.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setFamilyDetailOpen(true)}
          className="text-left"
        >
          <KpiCard
            label="Brand share (claims)"
            value={formatPct(pack.brandShare)}
            sub="Click for family detail"
            icon={<Factory className="h-5 w-5" />}
          />
        </button>
        <KpiCard
          label="Biosimilar share"
          value={formatPct(pack.bioShare)}
          icon={<PieIcon className="h-5 w-5" />}
          tone="emerald"
        />
        <KpiCard
          label="Brand cost (gross)"
          value={formatUsd(pack.brandCost)}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="slate"
        />
        <KpiCard
          label="Illustrative opportunity $"
          value={formatUsd(pack.opportunityUsd)}
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
      </section>
      <p className="text-xs text-slate-500">{pack.honesty}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Brand vs biosimilar mix"
          description={`${pack.referenceBrand} claim share (gross Part D).`}
          honesty="Gross Part D · not net of rebates/DIR"
          icon={<PieIcon className="h-4 w-4" />}
        >
          <MixDonutChart brandShare={pack.brandShare} bioShare={pack.bioShare} />
        </ChartCard>
        <ChartCard
          title="State concentration"
          description="Top states by illustrative opportunity $ for this family."
          honesty="Gross Part D · illustrative"
          icon={<MapPin className="h-4 w-4" />}
        >
          <HorizontalBarChart
            data={pack.stateConcentration.slice(0, 10).map((s) => ({
              name: s.state,
              value: s.opportunityUsd,
            }))}
            barName="Illustrative Opportunity $"
            height={280}
          />
        </ChartCard>
      </div>

      {partDSpend?.families?.[pack.familyId] ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 text-sm text-sky-950">
          <div className="font-semibold">CMS Part D national spend (market context)</div>
          <div className="mt-1 flex flex-wrap gap-4">
            <span>Spend {formatUsd(partDSpend.families[pack.familyId].totalSpendUsd, true)}</span>
            <span>Claims {formatNumber(partDSpend.families[pack.familyId].totalClaims)}</span>
            {partDSpend.families[pack.familyId].yoySpendChange != null ? (
              <span>
                YoY {((partDSpend.families[pack.familyId].yoySpendChange || 0) * 100).toFixed(1)}%
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-sky-800">{partDSpend.honesty || PARTD_SPEND_HONESTY}</p>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Users className="h-5 w-5 text-indigo-600" />
          Top brand-heavy NPIs
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ranked by illustrative opportunity $ (brand cost × peer biosimilar-share gap). Click a row
          for provider breakdown.
        </p>
        <div className="mt-3">
          <FilterBar>
            <FilterField label="Search NPIs">
              <input
                value={npiQ}
                onChange={(e) => setNpiQ(e.target.value)}
                placeholder="Name, NPI, state…"
                className={filterInputClass}
              />
            </FilterField>
          </FilterBar>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                  NPI
                </th>
                <SortableTh
                  k="providerName"
                  sortKey={npiSort.sortKey}
                  sortDir={npiSort.sortDir}
                  onSort={npiSort.toggleSort}
                  textAsc
                >
                  Provider
                </SortableTh>
                <SortableTh
                  k="state"
                  sortKey={npiSort.sortKey}
                  sortDir={npiSort.sortDir}
                  onSort={npiSort.toggleSort}
                  textAsc
                >
                  State
                </SortableTh>
                <SortableTh
                  k="brandCost"
                  sortKey={npiSort.sortKey}
                  sortDir={npiSort.sortDir}
                  onSort={npiSort.toggleSort}
                  right
                >
                  Brand cost
                </SortableTh>
                <SortableTh
                  k="biosimilarShare"
                  sortKey={npiSort.sortKey}
                  sortDir={npiSort.sortDir}
                  onSort={npiSort.toggleSort}
                  right
                >
                  Bio share
                </SortableTh>
                <SortableTh
                  k="peerGapPp"
                  sortKey={npiSort.sortKey}
                  sortDir={npiSort.sortDir}
                  onSort={npiSort.toggleSort}
                  right
                >
                  Peer gap
                </SortableTh>
                <SortableTh
                  k="opportunityScore"
                  sortKey={npiSort.sortKey}
                  sortDir={npiSort.sortDir}
                  onSort={npiSort.toggleSort}
                  right
                >
                  Opp $
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {npiSort.sorted.map((n) => (
                <tr
                  key={`${n.npi}-${pack.familyId}`}
                  className="cursor-pointer hover:bg-indigo-50/60"
                  onClick={() => setSelectedNpi({ npi: n.npi, familyId: pack.familyId })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedNpi({ npi: n.npi, familyId: pack.familyId });
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open detail for ${n.providerName}`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{n.npi}</td>
                  <td className="px-3 py-2 font-medium">{n.providerName}</td>
                  <td className="px-3 py-2">{n.state}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(n.brandCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(n.biosimilarShare)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPp(n.peerGapPp)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(n.opportunityScore)}
                  </td>
                </tr>
              ))}
              {npiSort.sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    No NPIs match search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MapPin className="h-5 w-5 text-indigo-600" />
          State concentration
        </h2>
        <p className="mt-1 text-sm text-slate-600">Click a state for geography breakdown.</p>
        <div className="mt-3">
          <FilterBar>
            <FilterField label="Search states">
              <input
                value={stateQ}
                onChange={(e) => setStateQ(e.target.value)}
                placeholder="CA, TX…"
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
                  k="state"
                  sortKey={stateSort.sortKey}
                  sortDir={stateSort.sortDir}
                  onSort={stateSort.toggleSort}
                  textAsc
                >
                  State
                </SortableTh>
                <SortableTh
                  k="brandClaims"
                  sortKey={stateSort.sortKey}
                  sortDir={stateSort.sortDir}
                  onSort={stateSort.toggleSort}
                  right
                >
                  Brand claims
                </SortableTh>
                <SortableTh
                  k="bioClaims"
                  sortKey={stateSort.sortKey}
                  sortDir={stateSort.sortDir}
                  onSort={stateSort.toggleSort}
                  right
                >
                  Bio claims
                </SortableTh>
                <SortableTh
                  k="brandShare"
                  sortKey={stateSort.sortKey}
                  sortDir={stateSort.sortDir}
                  onSort={stateSort.toggleSort}
                  right
                >
                  Brand share
                </SortableTh>
                <SortableTh
                  k="brandCost"
                  sortKey={stateSort.sortKey}
                  sortDir={stateSort.sortDir}
                  onSort={stateSort.toggleSort}
                  right
                >
                  Brand cost
                </SortableTh>
                <SortableTh
                  k="opportunityUsd"
                  sortKey={stateSort.sortKey}
                  sortDir={stateSort.sortDir}
                  onSort={stateSort.toggleSort}
                  right
                >
                  Opp $
                </SortableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stateSort.sorted.map((s) => (
                <tr
                  key={s.state}
                  className="cursor-pointer hover:bg-indigo-50/60"
                  onClick={() => setSelectedState(s.state)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedState(s.state);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open detail for ${s.state}`}
                >
                  <td className="px-3 py-2 font-medium">{s.state}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(s.brandClaims)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(s.bioClaims)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(s.brandShare)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(s.brandCost)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(s.opportunityUsd)}
                  </td>
                </tr>
              ))}
              {stateSort.sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No states match search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <PrescriberDetailPanel
        open={Boolean(selectedNpi)}
        npi={selectedNpi?.npi ?? null}
        familyId={selectedNpi?.familyId}
        onClose={() => setSelectedNpi(null)}
      />
      <StateDetailPanel
        open={Boolean(selectedState)}
        state={selectedState}
        onClose={() => setSelectedState(null)}
      />
      <FamilyDetailPanel
        open={familyDetailOpen}
        familyId={pack.familyId}
        onClose={() => setFamilyDetailOpen(false)}
      />
    </div>
  );
}

