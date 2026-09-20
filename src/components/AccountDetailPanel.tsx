"use client";

import { useState } from "react";
import Link from "next/link";
import type { EnrollmentGroup } from "@/lib/enrollmentTypes";
import { ENROLLMENT_HONESTY } from "@/lib/enrollmentTypes";
import { formatUsd, formatPct } from "@/lib/format";
import { DetailDrawer } from "@/components/DetailDrawer";
import { PrescriberDetailPanel } from "@/components/PrescriberDetailPanel";

function sourceHonesty(source: string, pecosId: string | null): string {
  switch (source) {
    case "pecos_asct_cntl_id":
      return pecosId
        ? `Grouped by PECOS association control ID ${pecosId} (CMS Public Provider Enrollment). Not a guaranteed legal entity or TIN.`
        : "Grouped by PECOS association control ID. Not a guaranteed legal entity or TIN.";
    case "nppes_org":
      return "Fallback grouping by NPPES organization display name when no PECOS association control ID was available.";
    case "singleton":
      return "Singleton — no shared PECOS association or org name matched other opportunity NPIs in cache.";
    default:
      return ENROLLMENT_HONESTY;
  }
}

function sourceBadge(source: string): string {
  switch (source) {
    case "pecos_asct_cntl_id":
      return "PECOS association control";
    case "nppes_org":
      return "NPPES org fallback";
    case "singleton":
      return "Singleton";
    default:
      return source;
  }
}


function memberOppUsd(m: EnrollmentGroup["npis"][number]): number {
  return m.liveOpportunityUsd ?? m.illustrativeOpportunityUsd;
}

export function AccountDetailPanel({
  open,
  group,
  honesty,
  onClose,
}: {
  open: boolean;
  group: EnrollmentGroup | null;
  honesty?: string;
  onClose: () => void;
}) {
  const [memberNpi, setMemberNpi] = useState<string | null>(null);
  const showAccount = open && Boolean(group) && !memberNpi;

  const membersSorted = group
    ? [...group.npis].sort((a, b) => memberOppUsd(b) - memberOppUsd(a))
    : [];

  return (
    <>
      <DetailDrawer
        open={showAccount}
        onClose={onClose}
        title={group?.displayName ?? "Account"}
        subtitle={
          group
            ? `${group.groupId} · ${group.npiCount} NPIs · ${sourceBadge(group.source)}${
                group.state ? ` · ${group.state}` : ""
              }`
            : undefined
        }
      >
        {group ? (
          <div className="space-y-6">
            <section className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-xs text-violet-950">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                  {sourceBadge(group.source)}
                </span>
                {group.pecosAssocControlId ? (
                  <span className="font-mono text-[10px] text-violet-800">
                    Assoc ID {group.pecosAssocControlId}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 leading-relaxed">
                {sourceHonesty(group.source, group.pecosAssocControlId)}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <Metric label="Brand cost" value={formatUsd(group.totalBrandCostUsd)} />
              <Metric
                label="Opportunity $ (peer gap)"
                value={formatUsd(group.liveOpportunityUsd ?? group.illustrativeOpportunityUsd)}
              />
            </section>
            {typeof group.illustrativeOpportunityUsd === "number" &&
            group.liveOpportunityUsd !== undefined &&
            Math.abs(group.liveOpportunityUsd - group.illustrativeOpportunityUsd) > 1 ? (
              <p className="text-xs text-slate-500">
                Illustrative (enrollment proxy): {formatUsd(group.illustrativeOpportunityUsd)} —
                differs from live peer-gap when share-gap proxy ≠ specialty peer gap.
              </p>
            ) : null}
            <p className="text-xs text-slate-500">
              Families: {group.families.join(", ") || "—"}
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/prescribers?group=${encodeURIComponent(group.groupId)}`}
                className="inline-flex rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Open members on Prescribers
              </Link>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Member NPIs — click for Part D breakdown
              </h3>
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Specialty</th>
                    <th className="py-2 text-right">Bio share</th>
                    <th className="py-2 text-right">Opp $ (peer gap)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {membersSorted.map((m) => (
                    <tr
                      key={m.npi}
                      className="cursor-pointer hover:bg-indigo-50/60"
                      onClick={() => setMemberNpi(m.npi)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setMemberNpi(m.npi);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open detail for ${m.providerName}`}
                    >
                      <td className="py-2">
                        <div className="font-medium">{m.providerName}</div>
                        <div className="font-mono text-xs text-slate-500">
                          {m.npi} · {m.state}
                        </div>
                      </td>
                      <td className="py-2 text-slate-600">{m.specialty || "—"}</td>
                      <td className="py-2 text-right tabular-nums">{formatPct(m.biosimilarShare)}</td>
                      <td className="py-2 text-right tabular-nums text-indigo-700">
                        {formatUsd(memberOppUsd(m))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <p className="text-xs text-slate-500">{honesty || ENROLLMENT_HONESTY}</p>
          </div>
        ) : null}
      </DetailDrawer>

      <PrescriberDetailPanel
        open={Boolean(memberNpi)}
        npi={memberNpi}
        onClose={() => setMemberNpi(null)}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
