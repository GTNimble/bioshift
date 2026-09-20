"use client";

import { useMemo, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import type { Opportunity, PurpleBookChange, AlertItem } from "@/lib/types";
import { buildWeeklyDigest, type WeeklyDigest } from "@/lib/watchlists/digest";
import type { WatchlistBundle } from "@/lib/watchlists/types";
import { formatUsd, formatPp } from "@/lib/format";
import { OpportunityHonesty } from "@/components/OpportunityFormula";

export function DigestPreview({
  bundle,
  opportunities,
  purpleChanges,
  launchAlerts,
}: {
  bundle: WatchlistBundle;
  opportunities: Opportunity[];
  purpleChanges: PurpleBookChange[];
  launchAlerts: AlertItem[];
}) {
  const [listId, setListId] = useState<string>("");
  const [remote, setRemote] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localDigest = useMemo(
    () =>
      buildWeeklyDigest({
        bundle,
        opportunities,
        purpleChanges,
        launchAlerts,
        listId: listId || null,
      }),
    [bundle, opportunities, purpleChanges, launchAlerts, listId]
  );

  const digest = remote ?? localDigest;

  async function loadRemote() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle, listId: listId || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      setRemote((await res.json()) as WeeklyDigest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load digest JSON");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weekly digest preview</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            In-app summary for watched molecules, states, and NPIs. Week of{" "}
            <span className="font-medium">{digest.weekOf}</span>. Email is not sent in this MVP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
            value={listId}
            onChange={(e) => {
              setListId(e.target.value);
              setRemote(null);
            }}
          >
            <option value="">All lists</option>
            {bundle.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadRemote()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Export JSON
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{digest.emailPathNote}</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Lists" value={String(digest.totals.lists)} />
        <Stat label="Watched items" value={String(digest.totals.items)} />
        <Stat label="Matching opps" value={String(digest.totals.opportunityCount)} />
        <Stat
          label="Illustrative opp $"
          value={formatUsd(digest.totals.opportunitySum, true)}
        />
      </div>
      <OpportunityHonesty />

      {digest.sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Add families, states, or NPIs to a watchlist to populate the digest.
        </p>
      ) : (
        digest.sections.map((sec) => (
          <section key={sec.listId} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{sec.listName}</h3>
              <p className="text-sm text-slate-600">
                {sec.itemCount} items · {sec.opportunityCount} opps ·{" "}
                <span className="font-medium text-indigo-700">
                  {formatUsd(sec.opportunitySum, true)}
                </span>
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <DigestCol title="Top opportunity $">
                {sec.topOpportunities.length === 0 ? (
                  <Empty />
                ) : (
                  <ul className="space-y-2">
                    {sec.topOpportunities.map((o) => (
                      <li key={`${o.npi}-${o.familyId}`} className="text-sm">
                        <div className="font-medium text-slate-800">{o.providerName}</div>
                        <div className="text-xs text-slate-500">
                          {o.referenceBrand} · {o.state} · {formatUsd(o.opportunityScore, true)} ·{" "}
                          {formatPp(o.peerGapPp)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DigestCol>
              <DigestCol title="Peer gap highlights">
                {sec.peerGapHighlights.length === 0 ? (
                  <Empty />
                ) : (
                  <ul className="space-y-2">
                    {sec.peerGapHighlights.map((o) => (
                      <li key={`${o.npi}-${o.familyId}-gap`} className="text-sm">
                        <div className="font-medium text-slate-800">
                          {formatPp(o.peerGapPp)} behind peers
                        </div>
                        <div className="text-xs text-slate-500">
                          {o.providerName} · {o.referenceBrand} · {o.peerScope}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DigestCol>
              <DigestCol title="Purple Book alerts (watched families)">
                {sec.purpleBookAlerts.length === 0 && sec.launchAlerts.length === 0 ? (
                  <Empty />
                ) : (
                  <ul className="space-y-2">
                    {sec.purpleBookAlerts.map((a) => (
                      <li key={a.id} className="text-sm">
                        <div className="font-medium text-slate-800">{a.title}</div>
                        <div className="text-xs text-slate-500">
                          {a.changeType} · {a.severity} · {a.publishedAt.slice(0, 10)}
                        </div>
                      </li>
                    ))}
                    {sec.launchAlerts.map((a) => (
                      <li key={a.id} className="text-sm">
                        <div className="font-medium text-slate-800">{a.title}</div>
                        <div className="text-xs text-slate-500">
                          {a.type} · {a.severity} · {a.publishedAt.slice(0, 10)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DigestCol>
            </div>
          </section>
        ))
      )}

      {remote ? (
        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-slate-700">Raw digest JSON</summary>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-600">
            {JSON.stringify(remote, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function DigestCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-slate-400">None matching this list.</p>;
}
