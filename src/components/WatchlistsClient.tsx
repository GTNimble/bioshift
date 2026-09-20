"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, Bookmark } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useWatchlists } from "@/components/WatchlistProvider";
import { DigestPreview } from "@/components/DigestPreview";
import { OpportunityHonesty } from "@/components/OpportunityFormula";
import { matchOpportunities } from "@/lib/watchlists/match";
import type { Opportunity, PurpleBookChange, AlertItem } from "@/lib/types";
import { formatUsd, formatPp, formatNumber } from "@/lib/format";
import { PrescriberDetailPanel } from "@/components/PrescriberDetailPanel";
import { FilterBar, FilterField, filterInputClass } from "@/components/list/FilterBar";
import { PLAN_LABELS } from "@/lib/plans";

type Tab = "lists" | "digest";

export function WatchlistsClient({
  opportunities,
  purpleChanges,
  launchAlerts,
  familyOptions,
  stateOptions,
}: {
  opportunities: Opportunity[];
  purpleChanges: PurpleBookChange[];
  launchAlerts: AlertItem[];
  familyOptions: Array<{ familyId: string; label: string }>;
  stateOptions: string[];
}) {
  const { session } = useAuth();
  const {
    ready,
    bundle,
    limits,
    persistence,
    syncError,
    createList,
    renameList,
    deleteList,
    addItem,
    removeItem,
  } = useWatchlists();

  const [tab, setTab] = useState<Tab>("lists");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [manualType, setManualType] = useState<"family" | "state" | "npi">("family");
  const [manualValue, setManualValue] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [matchQ, setMatchQ] = useState("");
  const [selectedOpp, setSelectedOpp] = useState<{ npi: string; familyId: string } | null>(null);

  const selected =
    bundle.lists.find((l) => l.id === selectedId) ?? bundle.lists[0] ?? null;

  const summary = useMemo(() => {
    if (!selected) return null;
    return matchOpportunities(selected, opportunities);
  }, [selected, opportunities]);

  function onCreate() {
    setFormError(null);
    const res = createList(newName || "My watchlist");
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setNewName("");
    setSelectedId(res.list.id);
  }

  function onRename() {
    if (!selected) return;
    setFormError(null);
    const res = renameList(selected.id, renameValue);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setRenaming(false);
  }

  function onAddManual() {
    if (!selected) {
      setFormError("Create a watchlist first");
      return;
    }
    setFormError(null);
    let value = manualValue.trim();
    let label = manualLabel.trim();
    if (manualType === "family") {
      const fam = familyOptions.find((f) => f.familyId === value);
      if (!fam) {
        setFormError("Pick a molecule family");
        return;
      }
      label = fam.label;
    } else if (manualType === "state") {
      value = value.toUpperCase();
      if (!stateOptions.includes(value)) {
        setFormError("Pick a state from the list");
        return;
      }
      label = label || value;
    } else {
      if (!/^\d{10}$/.test(value)) {
        setFormError("NPI must be 10 digits");
        return;
      }
      label = label || `NPI ${value}`;
    }
    const res = addItem({
      type: manualType,
      value,
      label,
      listId: selected.id,
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setManualValue("");
    setManualLabel("");
  }

  if (!ready) {
    return <p className="text-sm text-slate-500">Loading watchlists…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <TabBtn active={tab === "lists"} onClick={() => setTab("lists")}>
            Watchlists
          </TabBtn>
          <TabBtn active={tab === "digest"} onClick={() => setTab("digest")}>
            Digest
          </TabBtn>
        </div>
        <p className="text-xs text-slate-500">
          Plan <span className="font-medium">{session ? PLAN_LABELS[session.plan] : "—"}</span>
          : {limits.maxLists} list{limits.maxLists === 1 ? "" : "s"} ·{" "}
          {limits.maxItemsPerList} items/list · persist via{" "}
          <span className="font-medium">{persistence}</span>
          {persistence === "local" ? " (+ sync when signed in)" : ""}
        </p>
      </div>

      {syncError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {syncError}
        </p>
      ) : null}
      {formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {formError}
        </p>
      ) : null}

      {tab === "digest" ? (
        <DigestPreview
          bundle={bundle}
          opportunities={opportunities}
          purpleChanges={purpleChanges}
          launchAlerts={launchAlerts}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="space-y-3 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Your lists</h2>
              <ul className="mt-3 space-y-1">
                {bundle.lists.length === 0 ? (
                  <li className="text-xs text-slate-500">No lists yet — create one below.</li>
                ) : (
                  bundle.lists.map((l) => {
                    const active = (selected?.id ?? "") === l.id;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(l.id);
                            setRenaming(false);
                            setFormError(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm ${
                            active
                              ? "bg-indigo-50 font-medium text-indigo-800"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{l.name}</span>
                          <span className="ml-2 shrink-0 text-xs text-slate-400">
                            {l.items.length}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New list name"
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Free: 1 list / 5 items. Pro: 10 / 50. Enterprise: 25 / 200.{" "}
                <Link href="/pricing" className="text-indigo-600 hover:underline">
                  Upgrade
                </Link>
              </p>
            </div>
          </aside>

          <div className="space-y-4 lg:col-span-8">
            {!selected ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <Bookmark className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-600">
                  Create a watchlist, then add molecules, states, or NPIs from drawers or below.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      {renaming ? (
                        <div className="flex gap-2">
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={onRename}
                            className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenaming(false)}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Updated {selected.updatedAt.slice(0, 10)} · {selected.items.length}/
                        {limits.maxItemsPerList} items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(true);
                          setRenameValue(selected.name);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete “${selected.name}”?`)) {
                            deleteList(selected.id);
                            setSelectedId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {summary ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Metric label="Matching opportunities" value={formatNumber(summary.count)} />
                      <Metric
                        label="Illustrative opportunity $"
                        value={formatUsd(summary.opportunitySum, true)}
                        accent
                      />
                      <Metric
                        label="Top peer gap"
                        value={
                          summary.top[0] ? formatPp(summary.top[0].peerGapPp) : "—"
                        }
                      />
                    </div>
                  ) : null}
                  <OpportunityHonesty className="mt-2" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Add item</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select
                      value={manualType}
                      onChange={(e) => {
                        setManualType(e.target.value as typeof manualType);
                        setManualValue("");
                        setManualLabel("");
                      }}
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                    >
                      <option value="family">Molecule / family</option>
                      <option value="state">State</option>
                      <option value="npi">NPI</option>
                    </select>
                    {manualType === "family" ? (
                      <select
                        value={manualValue}
                        onChange={(e) => setManualValue(e.target.value)}
                        className="min-w-[12rem] flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                      >
                        <option value="">Select family…</option>
                        {familyOptions.map((f) => (
                          <option key={f.familyId} value={f.familyId}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    ) : manualType === "state" ? (
                      <select
                        value={manualValue}
                        onChange={(e) => setManualValue(e.target.value)}
                        className="min-w-[8rem] rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                      >
                        <option value="">State…</option>
                        {stateOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          value={manualValue}
                          onChange={(e) => setManualValue(e.target.value)}
                          placeholder="10-digit NPI"
                          className="w-36 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                        />
                        <input
                          value={manualLabel}
                          onChange={(e) => setManualLabel(e.target.value)}
                          placeholder="Label (optional)"
                          className="min-w-[10rem] flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={onAddManual}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Tip: open a family, state, or prescriber drawer and use{" "}
                    <span className="font-medium">Add to watchlist</span>.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Type</th>
                        <th className="px-4 py-2 font-semibold">Label</th>
                        <th className="px-4 py-2 font-semibold">Value</th>
                        <th className="px-4 py-2 font-semibold">Added</th>
                        <th className="px-4 py-2 font-semibold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selected.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                            No items yet.
                          </td>
                        </tr>
                      ) : (
                        selected.items.map((it) => (
                          <tr key={it.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-2 capitalize text-slate-600">{it.type}</td>
                            <td className="px-4 py-2 font-medium text-slate-900">{it.label}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">{it.value}</td>
                            <td className="px-4 py-2 text-xs text-slate-500">
                              {it.addedAt.slice(0, 10)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeItem(selected.id, it.id)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {summary && summary.top.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Top matching opportunities
                    </h3>
                    <div className="mt-2">
                      <FilterBar>
                        <FilterField label="Search matches">
                          <input
                            value={matchQ}
                            onChange={(e) => setMatchQ(e.target.value)}
                            placeholder="Provider, brand, state…"
                            className={filterInputClass}
                          />
                        </FilterField>
                      </FilterBar>
                    </div>
                    <ul className="mt-1 divide-y divide-slate-100">
                      {summary.top
                        .filter((o) => {
                          const qq = matchQ.trim().toLowerCase();
                          if (!qq) return true;
                          return (
                            o.providerName.toLowerCase().includes(qq) ||
                            o.referenceBrand.toLowerCase().includes(qq) ||
                            o.state.toLowerCase().includes(qq) ||
                            o.npi.includes(qq) ||
                            o.specialty.toLowerCase().includes(qq)
                          );
                        })
                        .slice(0, 12)
                        .map((o) => (
                        <li
                          key={`${o.npi}-${o.familyId}`}
                          className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 py-2 text-sm hover:bg-indigo-50/50"
                          onClick={() => setSelectedOpp({ npi: o.npi, familyId: o.familyId })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedOpp({ npi: o.npi, familyId: o.familyId });
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Open detail for ${o.providerName}`}
                        >
                          <div>
                            <span className="font-medium text-slate-900">{o.providerName}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              {o.referenceBrand} · {o.state} · {o.specialty}
                            </span>
                          </div>
                          <div className="tabular-nums text-indigo-700">
                            {formatUsd(o.opportunityScore, true)}
                            <span className="ml-2 text-xs text-slate-500">
                              {formatPp(o.peerGapPp)} gap
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-slate-500">Click a match for provider breakdown.</p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      <PrescriberDetailPanel
        open={Boolean(selectedOpp)}
        npi={selectedOpp?.npi ?? null}
        familyId={selectedOpp?.familyId}
        onClose={() => setSelectedOpp(null)}
      />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          accent ? "text-indigo-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
