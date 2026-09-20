"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  ExternalLink,
  Filter,
  Lock,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { FREE_SAMPLE_LIMIT } from "@/lib/plans";
import { formatUsd } from "@/lib/format";
import type { AlertItem, PurpleBookChange, PurpleBookChangelog } from "@/lib/types";
import { FamilyDetailPanel } from "@/components/FamilyDetailPanel";
import { filterInputClass } from "@/components/list/FilterBar";

const severityStyles = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-slate-50 text-slate-700 border-slate-200",
};

const changeStyles: Record<string, string> = {
  N: "bg-emerald-50 text-emerald-800 border-emerald-200",
  R: "bg-sky-50 text-sky-800 border-sky-200",
  U: "bg-violet-50 text-violet-800 border-violet-200",
};

type FamilyOption = { familyId: string; label: string };

export function AlertsClient({
  changelog,
  launchAlerts,
  families,
}: {
  changelog: PurpleBookChangelog;
  launchAlerts: AlertItem[];
  families: FamilyOption[];
}) {
  const { hasFeature, session } = useAuth();
  const full = hasFeature("alerts_full");
  const isFree = session?.plan === "free" || !full;

  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [changeFilter, setChangeFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  const filteredChanges = useMemo(() => {
    const qq = searchQ.trim().toLowerCase();
    return (changelog.changes ?? []).filter((c) => {
      if (familyFilter !== "all" && c.familyId !== familyFilter) return false;
      if (changeFilter !== "all" && c.changeType !== changeFilter) return false;
      if (!qq) return true;
      return (
        c.title.toLowerCase().includes(qq) ||
        c.brand.toLowerCase().includes(qq) ||
        c.ingredient.toLowerCase().includes(qq) ||
        c.message.toLowerCase().includes(qq) ||
        (c.blaNumber || "").toLowerCase().includes(qq)
      );
    });
  }, [changelog.changes, familyFilter, changeFilter, searchQ]);

  const filteredLaunch = useMemo(() => {
    const qq = searchQ.trim().toLowerCase();
    return launchAlerts.filter((a) => {
      if (familyFilter !== "all" && a.familyId !== familyFilter) return false;
      if (!qq) return true;
      return (
        a.title.toLowerCase().includes(qq) ||
        a.brand.toLowerCase().includes(qq) ||
        a.message.toLowerCase().includes(qq)
      );
    });
  }, [launchAlerts, familyFilter, searchQ]);

  const visibleChanges = isFree
    ? filteredChanges.slice(0, FREE_SAMPLE_LIMIT)
    : filteredChanges;
  const lockedChangeCount = isFree
    ? Math.max(0, filteredChanges.length - FREE_SAMPLE_LIMIT)
    : 0;
  const visibleLaunch = isFree ? [] : filteredLaunch;

  const familyOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const c of changelog.changes ?? []) ids.add(c.familyId);
    for (const a of launchAlerts) ids.add(a.familyId);
    for (const f of families) ids.add(f.familyId);
    return Array.from(ids)
      .sort()
      .map((id) => {
        const known = families.find((f) => f.familyId === id);
        return {
          familyId: id,
          label: known?.label ?? id.replace(/_/g, " "),
        };
      });
  }, [changelog.changes, launchAlerts, families]);

  return (
    <div>
      {isFree ? (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-2 text-xs font-medium text-amber-900">
          Free plan teaser — showing top {FREE_SAMPLE_LIMIT} Purple Book monthly changes. Upgrade to
          Pro for the full changelog, filters, and launch/conversion alerts.
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-950">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <div>
            <p className="font-semibold">
              Source: FDA Purple Book monthly download
              {changelog.report_month ? ` · report month ${changelog.report_month}` : ""}
            </p>
            <p className="mt-0.5 text-indigo-900/80">
              Not a real-time FDA approvals feed. Changes use the monthly file&apos;s N (newly
              approved) / R (added in release) / U (updated) section
              {changelog.has_prior_month
                ? `, plus a snapshot diff vs ${changelog.prior_snapshot}.`
                : ". No prior-month snapshot on disk yet — showing this month&apos;s N/R/U only."}
            </p>
            {changelog.source_url ? (
              <a
                href={changelog.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline"
              >
                FDA file <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <label className="text-xs text-slate-600">
          Search
          <input
            className={`ml-2 min-w-[10rem] ${filterInputClass}`}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Brand, BLA, title…"
          />
        </label>
        <label className="text-xs text-slate-600">
          Family
          <select
            className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 disabled:opacity-50"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            disabled={isFree}
          >
            <option value="all">All families</option>
            {familyOptions.map((f) => (
              <option key={f.familyId} value={f.familyId}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Change
          <select
            className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 disabled:opacity-50"
            value={changeFilter}
            onChange={(e) => setChangeFilter(e.target.value)}
            disabled={isFree}
          >
            <option value="all">N / R / U</option>
            <option value="N">N — Newly approved</option>
            <option value="R">R — Added in release</option>
            <option value="U">U — Updated</option>
          </select>
        </label>
        {isFree ? (
          <span className="text-[11px] text-slate-400">Filters unlock on Pro+</span>
        ) : (
          <span className="text-[11px] text-slate-400">
            {filteredChanges.length} Purple Book · {filteredLaunch.length} launch/conversion
          </span>
        )}
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Purple Book monthly changelog
          <span className="ml-2 text-xs font-normal text-slate-500">
            {changelog.stats?.N ?? 0}N · {changelog.stats?.R ?? 0}R · {changelog.stats?.U ?? 0}U
            in-scope
          </span>
        </h2>

        {visibleChanges.length === 0 ? (
          <EmptyChangelog changelog={changelog} showScope={!isFree} />
        ) : (
          <div className="space-y-4">
            {visibleChanges.map((c) => (
              <PurpleChangeCard key={c.id} change={c} canLinkFamily={full} onOpenFamily={setSelectedFamilyId} />
            ))}
          </div>
        )}

        {lockedChangeCount > 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-slate-400" />
            <p className="text-sm font-medium text-slate-800">
              +{lockedChangeCount} more Purple Book change
              {lockedChangeCount === 1 ? "" : "s"} locked
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pro unlocks the full monthly changelog and launch/conversion alerts.
            </p>
            <Link
              href="/pricing"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Sparkles className="h-3.5 w-3.5" /> Upgrade to Pro
            </Link>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Launch &amp; conversion signals
          <span className="ml-2 text-xs font-normal text-slate-500">
            Purple Book product lists + filtered CMS Part D spend
          </span>
        </h2>
        {isFree ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-800">
              <Lock className="h-4 w-4 text-slate-400" /> Pro+ feature
            </div>
            Launch/conversion alerts derived from biosimilar counts and brand spend are available on
            Pro and Enterprise.
          </div>
        ) : visibleLaunch.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No launch/conversion alerts match the current family filter.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleLaunch.map((a) => (
              <LaunchAlertCard key={a.id} alert={a} onOpenFamily={setSelectedFamilyId} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        Refresh with <code className="rounded bg-white px-1">npm run data:purple</code> (archives a
        monthly snapshot) or <code className="rounded bg-white px-1">npm run data:purple:changelog</code>
        . Alerts are not push notifications. Click a card for family breakdown.
      </div>

      <FamilyDetailPanel
        open={Boolean(selectedFamilyId)}
        familyId={selectedFamilyId}
        onClose={() => setSelectedFamilyId(null)}
      />
    </div>
  );
}

function PurpleChangeCard({
  change,
  canLinkFamily,
  onOpenFamily,
}: {
  change: PurpleBookChange;
  canLinkFamily: boolean;
  onOpenFamily: (familyId: string) => void;
}) {
  return (
    <article
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
      onClick={() => onOpenFamily(change.familyId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenFamily(change.familyId);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open family detail for ${change.brand}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-lg bg-violet-50 p-2 text-violet-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  changeStyles[change.changeType] ?? changeStyles.U
                }`}
              >
                {change.changeType} · {change.changeLabel}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  severityStyles[change.severity]
                }`}
              >
                {change.severity}
              </span>
              {change.interchangeable ? (
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 ring-1 ring-teal-200">
                  Interchangeable
                </span>
              ) : null}
              <span className="text-xs text-slate-400">{change.publishedAt}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">{change.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{change.message}</p>
            <p className="mt-2 text-xs text-slate-500">
              Brand ref: <span className="font-medium text-slate-700">{change.brand}</span>
              {" · "}
              {change.ingredient}
              {change.blaNumber ? ` · BLA ${change.blaNumber}` : null}
              {change.approvalDate || change.interApprovalDate
                ? ` · ${change.interApprovalDate || change.approvalDate}`
                : null}
            </p>
            {canLinkFamily ? (
              <Link
                href={`/drugs?family=${encodeURIComponent(change.familyId)}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                Open on Drugs page <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function LaunchAlertCard({
  alert,
  onOpenFamily,
}: {
  alert: AlertItem;
  onOpenFamily: (familyId: string) => void;
}) {
  return (
    <article
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
      onClick={() => onOpenFamily(alert.familyId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenFamily(alert.familyId);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open family detail for ${alert.brand}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600">
            {alert.type === "launch" ? (
              <Rocket className="h-5 w-5" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  severityStyles[alert.severity]
                }`}
              >
                {alert.severity}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {alert.type}
              </span>
              <span className="text-xs text-slate-400">{alert.publishedAt}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">{alert.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
            <p className="mt-2 text-xs text-slate-500">
              Brand: <span className="font-medium text-slate-700">{alert.brand}</span>
              {" · "}Biosimilars: {alert.biosimilars.join(", ")}
            </p>
            <Link
              href={`/drugs?family=${encodeURIComponent(alert.familyId)}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              Open on Drugs page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Illust. brand spend
          </div>
          <div className="font-semibold text-slate-900">
            {formatUsd(alert.estBrandSpendUsd, true)}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyChangelog({
  changelog,
  showScope,
}: {
  changelog: PurpleBookChangelog;
  showScope: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
        {changelog.empty_reason ??
          "No in-scope Purple Book N/R/U changes for tracked molecule families this month."}
        {!changelog.has_prior_month ? (
          <p className="mt-2 text-xs text-slate-500">
            Tip: keep running <code className="rounded bg-white px-1">npm run data:purple</code> each
            month — snapshots land in <code className="rounded bg-white px-1">data/raw/purple_book_snapshots/</code>{" "}
            so future diffs work automatically.
          </p>
        ) : null}
      </div>
      {showScope && (changelog.inScopeProducts?.length ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Purple Book products in scope (biosimilar / interchangeable)
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {changelog.inScopeProducts.slice(0, 12).map((p) => (
              <li
                key={`${p.familyId}-${p.blaNumber}-${p.productName}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <div>
                  <span className="font-medium text-slate-900">{p.productName}</span>
                  <span className="text-slate-500">
                    {" "}
                    · {p.ingredient} vs {p.brand}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {p.interchangeable ? "Interchangeable · " : ""}
                  {p.interApprovalDate || p.approvalDate || "date n/a"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
