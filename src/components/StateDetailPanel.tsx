"use client";

import { useEffect, useState } from "react";
import type { StateDetail } from "@/lib/detail";
import { formatUsd, formatPct, formatNumber, formatPp } from "@/lib/format";
import { OpportunityHonesty } from "@/components/OpportunityFormula";
import { ExportButton } from "@/components/ExportButton";
import { DetailDrawer } from "@/components/DetailDrawer";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";

export function StateDetailPanel({
  state,
  open,
  onClose,
}: {
  state: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !state) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/detail/state?state=${encodeURIComponent(state)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load");
        return r.json() as Promise<StateDetail>;
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
  }, [open, state]);

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={state ? `State ${state}` : "State"}
      subtitle={
        detail
          ? `${formatNumber(detail.npiCount)} NPIs · ${formatNumber(detail.oppCount)} opportunities`
          : undefined
      }
      footer={
        state ? (
          <div className="flex flex-wrap items-center gap-2">
            <AddToWatchlistButton type="state" value={state} label={`State ${state}`} />
            <ExportButton
              href={`/api/export/state?state=${encodeURIComponent(state)}`}
              label="Export state list"
              requireEnterprise
            />
            <span className="text-xs text-slate-500">Territory-style opportunity CSV · CY2024</span>
          </div>
        ) : null
      }
    >
      {loading ? <p className="text-sm text-slate-500">Loading breakdown…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {detail ? <StateDetailBody detail={detail} /> : null}
    </DetailDrawer>
  );
}

function StateDetailBody({ detail }: { detail: StateDetail }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Illustrative Opportunity $
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-indigo-700">
            {formatUsd(detail.opportunity)}
          </div>
          <OpportunityHonesty className="mt-1" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Brand cost (gross)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {formatUsd(detail.brandCost)}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Top families in {detail.state}
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2 text-right">Opps</th>
                <th className="px-3 py-2 text-right">Brand cost</th>
                <th className="px-3 py-2 text-right">Opportunity $</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.topFamilies.map((f) => (
                <tr key={f.familyId}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.referenceBrand}</div>
                    <div className="text-xs text-slate-500">{f.ingredient}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(f.brandCost)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(f.opportunity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Top NPIs in {detail.state}
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2 text-right">Bio share</th>
                <th className="px-3 py-2 text-right">Peer gap</th>
                <th className="px-3 py-2 text-right">Opportunity $</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.topNpis.map((o) => (
                <tr key={`${o.npi}-${o.familyId}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{o.providerName}</div>
                    <div className="font-mono text-xs text-slate-500">
                      {o.npi} · {o.specialty}
                    </div>
                  </td>
                  <td className="px-3 py-2">{o.referenceBrand}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(o.biosimilarShare)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPp(o.peerGapPp)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                    {formatUsd(o.opportunityScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
