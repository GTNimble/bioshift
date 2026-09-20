"use client";

import { useEffect, useState } from "react";
import type { FamilyDetail } from "@/lib/detail";
import { formatUsd, formatPct, formatNumber, formatPp } from "@/lib/format";
import { OpportunityHonesty } from "@/components/OpportunityFormula";
import { ExportButton } from "@/components/ExportButton";
import { DetailDrawer } from "@/components/DetailDrawer";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";

export function FamilyDetailPanel({
  familyId,
  open,
  onClose,
}: {
  familyId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !familyId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/detail/family?familyId=${encodeURIComponent(familyId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load");
        return r.json() as Promise<FamilyDetail>;
      })
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, familyId]);

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={detail ? `${detail.family.referenceBrand}` : familyId ?? "Family"}
      subtitle={
        detail
          ? `${detail.family.ingredient} · ${detail.family.therapeuticArea}`
          : undefined
      }
      footer={
        familyId ? (
          <div className="flex flex-wrap items-center gap-2">
            <AddToWatchlistButton
              type="family"
              value={familyId}
              label={
                detail
                  ? `${detail.family.referenceBrand} (${detail.family.ingredient})`
                  : familyId
              }
            />
            <ExportButton
              href={`/api/export/family?familyId=${encodeURIComponent(familyId)}`}
              label="Export family list"
              requireEnterprise
            />
            <span className="text-xs text-slate-500">All CMS rows for this family · CY2024 gross cost</span>
          </div>
        ) : null
      }
    >
      {loading ? <p className="text-sm text-slate-500">Loading breakdown…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {detail ? <FamilyDetailBody detail={detail} /> : null}
    </DetailDrawer>
  );
}

function FamilyDetailBody({ detail }: { detail: FamilyDetail }) {
  const s = detail.stats;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Biosimilar share" value={formatPct(s.biosimilarShare)} />
        <Metric label="Brand cost (gross)" value={formatUsd(s.brandCost, true)} />
        <Metric label="Bio cost (gross)" value={formatUsd(s.bioCost, true)} />
        <Metric label="Total claims" value={formatNumber(s.brandClaims + s.bioClaims)} />
      </section>

      <section className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
          Illustrative Opportunity $ (Σ top NPIs)
        </h3>
        <p className="mt-1 text-lg font-semibold tabular-nums text-indigo-700">
          {formatUsd(
            detail.topOpportunities.reduce((sum, o) => sum + o.opportunityScore, 0),
            true
          )}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Sum of brand_gross × peer gap for ranked NPIs in this family. Peer gap uses specialty+state
          or family cohort means.
        </p>
        <OpportunityHonesty className="mt-2" />
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Brand vs biosimilar mix (by product)
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Claims</th>
                <th className="px-3 py-2 text-right">Gross cost</th>
                <th className="px-3 py-2 text-right">Benes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.productMix.map((p) => (
                <tr key={p.productId}>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.type === "reference"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {p.type}
                      {p.interchangeable ? " · IX" : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(p.Tot_Clms)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(p.Tot_Drug_Cst)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(p.Tot_Benes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Top opportunity NPIs
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2 text-right">Brand cost</th>
                <th className="px-3 py-2 text-right">Bio share</th>
                <th className="px-3 py-2 text-right">Peer gap</th>
                <th className="px-3 py-2 text-right">Opportunity $</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.topOpportunities.map((o) => (
                <tr key={`${o.npi}-${o.familyId}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{o.providerName}</div>
                    <div className="font-mono text-xs text-slate-500">{o.npi}</div>
                  </td>
                  <td className="px-3 py-2">{o.state}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(o.brandCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(o.biosimilarShare)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPp(o.peerGapPp)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(o.opportunityScore)}
                  </td>
                </tr>
              ))}
              {detail.topOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No opportunity rows for this family.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
