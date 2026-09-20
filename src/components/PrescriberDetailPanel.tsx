"use client";

import type { EnrollmentGroup } from "@/lib/enrollmentTypes";
import { ENROLLMENT_HONESTY } from "@/lib/enrollmentTypes";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Phone, MapPin, Printer, Building2 } from "lucide-react";
import type { PrescriberDetail } from "@/lib/detail";
import type { ContactPayload, NppesContact } from "@/lib/nppesTypes";
import { formatAddressLines } from "@/lib/nppesTypes";
import { formatUsd, formatPct, formatNumber, formatPp } from "@/lib/format";
import type { OpenPaymentsPayload } from "@/lib/openPaymentsTypes";
import { OPEN_PAYMENTS_HONESTY } from "@/lib/openPaymentsTypes";
import { OpportunityHonesty } from "@/components/OpportunityFormula";
import { ExportButton } from "@/components/ExportButton";
import { DetailDrawer } from "@/components/DetailDrawer";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";

export function PrescriberDetailPanel({
  npi,
  familyId,
  open,
  onClose,
}: {
  npi: string | null;
  familyId?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PrescriberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !npi) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ npi });
    if (familyId) qs.set("familyId", familyId);
    fetch(`/api/detail/prescriber?${qs}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load");
        return r.json() as Promise<PrescriberDetail>;
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
  }, [open, npi, familyId]);

  const title = detail?.identity.providerName ?? (npi ? `NPI ${npi}` : "Provider");
  const subtitle = detail
    ? `NPI ${detail.identity.npi} · ${detail.identity.state} · ${detail.identity.specialty}`
    : undefined;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        npi ? (
          <div className="flex flex-wrap items-center gap-2">
            <AddToWatchlistButton
              type="npi"
              value={npi}
              label={detail?.identity.providerName ?? `NPI ${npi}`}
            />
            <ExportButton
              href={`/api/export/npi?npi=${encodeURIComponent(npi)}`}
              label="Export this provider"
              requireEnterprise
            />
            <span className="text-xs text-slate-500">CMS Part D CY2024 gross cost · filtered molecules</span>
          </div>
        ) : null
      }
    >
      {loading ? <p className="text-sm text-slate-500">Loading breakdown…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {detail ? <PrescriberDetailBody detail={detail} /> : null}
    </DetailDrawer>
  );
}

function isLockedContact(c: ContactPayload): c is { locked: true } {
  return !!c && typeof c === "object" && "locked" in c && (c as { locked: boolean }).locked === true;
}

function isNppesContact(c: ContactPayload): c is NppesContact {
  return !!c && typeof c === "object" && "source" in c && (c as NppesContact).source === "NPPES";
}

function ContactSection({ contact }: { contact: ContactPayload }) {
  if (isLockedContact(contact)) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Contact</h3>
        <div className="mt-2 flex items-start gap-2 text-sm text-amber-950">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium">Unlock practice phone &amp; address on Pro</p>
            <p className="mt-1 text-xs text-amber-800">
              NPPES practice location enrichment is available on Pro and Enterprise. No clinician email
              in the public registry.
            </p>
            <Link
              href="/pricing"
              className="mt-2 inline-flex text-xs font-semibold text-indigo-700 hover:underline"
            >
              View pricing →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!isNppesContact(contact)) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
        <p className="mt-2 text-sm text-slate-600">
          No NPPES practice location on file yet. Open again after enrichment, or run{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">npm run data:nppes</code>.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Practice address &amp; phone from NPPES (no email in public registry). Outreach still subject to
          TCPA.
        </p>
      </section>
    );
  }

  const lines = formatAddressLines(contact);
  const refreshed = contact.refreshedAt
    ? new Date(contact.refreshedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          NPPES
        </span>
      </div>

      {lines.length > 0 ? (
        <div className="mt-2 flex items-start gap-2 text-sm text-slate-800">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            {lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No practice address in NPPES for this NPI.</p>
      )}

      {contact.telephone ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-slate-400" />
          <a
            href={`tel:${contact.telephone.replace(/[^\d+]/g, "")}`}
            className="font-medium text-indigo-700 hover:underline"
          >
            {contact.telephone}
          </a>
        </div>
      ) : null}

      {contact.fax ? (
        <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
          <Printer className="h-4 w-4 text-slate-400" />
          <span>Fax {contact.fax}</span>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Practice address &amp; phone from NPPES (no email in public registry). Outreach still subject to
        TCPA.
      </p>
      {refreshed ? (
        <p className="mt-1 text-[10px] text-slate-400">Last refreshed {refreshed}</p>
      ) : null}
    </section>
  );
}


function isLockedOpenPayments(p: OpenPaymentsPayload): p is { locked: true } {
  return !!p && typeof p === "object" && "locked" in p && (p as { locked: boolean }).locked === true;
}


function sourceLabel(source: string): string {
  switch (source) {
    case "pecos_asct_cntl_id":
      return "PECOS association control";
    case "nppes_org":
      return "NPPES organization (fallback)";
    case "singleton":
      return "Singleton — no shared association";
    default:
      return source || "Enrollment";
  }
}

function EnrollmentGroupSection({ group }: { group: EnrollmentGroup | null | undefined }) {
  if (!group) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account / PECOS
          </h3>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Unlinked
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          No enrollment group in cache for this NPI. Coverage is limited to top Opportunity NPIs —
          run <code className="rounded bg-slate-200 px-1 text-xs">npm run data:enrollment</code> to
          expand.
        </p>
        <Link href="/accounts" className="mt-2 inline-flex text-xs font-semibold text-indigo-700 hover:underline">
          Browse Accounts →
        </Link>
      </section>
    );
  }

  const opp = group.liveOpportunityUsd ?? group.illustrativeOpportunityUsd;
  const accountsHref = `/accounts?group=${encodeURIComponent(group.groupId)}`;

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-800">
          <Building2 className="h-3.5 w-3.5" />
          Account / PECOS
        </h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
          {sourceLabel(group.source)}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-900">{group.displayName}</p>
      <p className="font-mono text-[10px] text-slate-500">{group.groupId}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Members</dt>
          <dd className="font-semibold text-slate-900">{group.npiCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Group Opp $</dt>
          <dd className="font-semibold text-indigo-700">{formatUsd(opp, true)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">State</dt>
          <dd className="font-medium text-slate-800">{group.state || "—"}</dd>
        </div>
        {group.pecosAssocControlId ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-slate-500">PECOS association control ID</dt>
            <dd className="font-mono text-slate-800">{group.pecosAssocControlId}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={accountsHref}
          className="inline-flex rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
        >
          Open on Accounts
        </Link>
        <Link
          href={`/prescribers?group=${encodeURIComponent(group.groupId)}`}
          className="inline-flex rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50"
        >
          Filter Prescribers by group
        </Link>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-violet-800/80">
        {ENROLLMENT_HONESTY}
      </p>
    </section>
  );
}

function OpenPaymentsSection({ payload }: { payload: OpenPaymentsPayload }) {
  if (isLockedOpenPayments(payload)) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          Open Payments
        </h3>
        <div className="mt-2 flex items-start gap-2 text-sm text-amber-950">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium">Unlock manufacturer payment totals on Pro</p>
            <p className="mt-1 text-xs text-amber-800">
              Public CMS Open Payments (Sunshine Act) — general / research / ownership rollups for
              opportunity NPIs. Program years lag publication.
            </p>
            <a href="/pricing" className="mt-2 inline-flex text-xs font-semibold text-indigo-700 hover:underline">
              View pricing →
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Payments</h3>
        <p className="mt-2 text-sm text-slate-600">
          No Open Payments cache for this NPI yet. Run{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">npm run data:openpayments</code>.
        </p>
        <p className="mt-2 text-xs text-slate-500">{OPEN_PAYMENTS_HONESTY}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Payments</h3>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
          PY {payload.programYear}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Total</dt>
          <dd className="font-semibold text-slate-900">{formatUsd(payload.totalUsd)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">General</dt>
          <dd className="font-medium">{formatUsd(payload.generalTotalUsd)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Research</dt>
          <dd className="font-medium">{formatUsd(payload.researchTotalUsd)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ownership</dt>
          <dd className="font-medium">{formatUsd(payload.ownershipTotalUsd)}</dd>
        </div>
      </dl>
      {payload.score != null || (payload.flags && payload.flags.length) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {payload.score != null ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
              Score {payload.score.toFixed(0)}
            </span>
          ) : null}
          {(payload.flags || []).map((f) => (
            <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              {f.replace(/_/g, " ")}
            </span>
          ))}
          {payload.topCompanyName ? (
            <span className="text-xs text-slate-500">
              Top: {payload.topCompanyName}
              {payload.topCompanyConcentration != null
                ? ` (${(payload.topCompanyConcentration * 100).toFixed(0)}%)`
                : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      {payload.topCompanies.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Top paying companies
          </h4>
          <ul className="mt-1 space-y-1">
            {payload.topCompanies.slice(0, 5).map((c) => (
              <li key={c.name} className="flex justify-between gap-2 text-xs text-slate-700">
                <span className="truncate">{c.name}</span>
                <span className="shrink-0 tabular-nums font-medium">{formatUsd(c.amountUsd)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">No company-level rows in cache for this NPI/year.</p>
      )}
      {payload.lagNote ? (
        <p className="mt-1 text-[10px] text-slate-400">{payload.lagNote}</p>
      ) : null}
    </section>
  );
}

function PrescriberDetailBody({ detail }: { detail: PrescriberDetail }) {
  const opp = detail.opportunity;
  const fam = detail.family;

  return (
    <div className="space-y-6">
      <ContactSection contact={detail.contact ?? null} />
      <OpenPaymentsSection payload={(detail as { openPayments?: OpenPaymentsPayload }).openPayments ?? null} />
      <EnrollmentGroupSection group={(detail as { enrollmentGroup?: EnrollmentGroup | null }).enrollmentGroup} />

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drug / family</h3>
        <p className="mt-1 text-base font-semibold text-slate-900">
          {fam?.referenceBrand ?? opp?.referenceBrand ?? "—"}{" "}
          <span className="font-normal text-slate-500">({fam?.ingredient ?? opp?.ingredient ?? "—"})</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Brand claims {formatNumber(detail.totals.brandClaims)}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Biosimilar claims {formatNumber(detail.totals.bioClaims)}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Metric label="Tot_Clms" value={formatNumber(detail.totals.Tot_Clms)} />
        <Metric
          label="Tot_Drug_Cst"
          hint="Gross Part D cost"
          value={formatUsd(detail.totals.Tot_Drug_Cst)}
        />
        <Metric label="Tot_Benes" value={formatNumber(detail.totals.Tot_Benes)} />
      </section>

      {opp ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Opportunity / peer context
          </h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Illustrative Opportunity $</dt>
              <dd className="font-semibold text-indigo-700">{formatUsd(opp.opportunityScore)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Peer gap</dt>
              <dd className="font-semibold text-slate-900">{formatPp(opp.peerGapPp)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Brand cost (gross)</dt>
              <dd className="font-medium">{formatUsd(opp.brandCost)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Biosimilar share</dt>
              <dd className="font-medium">{formatPct(opp.biosimilarShare)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Peer bio share ({opp.peerScope})</dt>
              <dd className="font-medium">{formatPct(opp.peerBiosimilarShare)}</dd>
            </div>
          </dl>
          <OpportunityHonesty className="mt-3" />
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Products for this NPI × family
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Drug</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Claims</th>
                <th className="px-3 py-2 text-right">Gross cost</th>
                <th className="px-3 py-2 text-right">Benes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.familyRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium">{r.drugName}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.isBrand ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {r.isBrand ? "brand" : "biosimilar"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.Tot_Clms)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsd(r.Tot_Drug_Cst)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.Tot_Benes)}</td>
                </tr>
              ))}
              {detail.familyRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    No product rows for this family.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Other products for same NPI
        </h3>
        {detail.otherProductRows.length === 0 && detail.otherOpportunities.length === 0 ? (
          <p className="text-sm text-slate-500">No other biosimilar-family rows for this provider in the dataset.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">Drug</th>
                  <th className="px-3 py-2">Family</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Claims</th>
                  <th className="px-3 py-2 text-right">Gross cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.otherProductRows.slice(0, 40).map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-medium">{r.drugName}</td>
                    <td className="px-3 py-2 text-slate-600">{r.familyId}</td>
                    <td className="px-3 py-2 text-xs">{r.isBrand ? "brand" : "biosimilar"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.Tot_Clms)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatUsd(r.Tot_Drug_Cst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {detail.otherOpportunities.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            Also ranked in {detail.otherOpportunities.length} other family opportunity row
            {detail.otherOpportunities.length === 1 ? "" : "s"}
            {detail.otherOpportunities
              .slice(0, 5)
              .map((o) => ` ${o.referenceBrand}`)
              .join(",")}
            {detail.otherOpportunities.length > 5 ? "…" : ""}.
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Purple Book biosimilars
        </h3>
        {detail.purpleBookBiosimilars.length === 0 ? (
          <p className="text-sm text-slate-500">No biosimilars listed for this family.</p>
        ) : (
          <ul className="space-y-1.5">
            {detail.purpleBookBiosimilars.map((p) => (
              <li
                key={p.productId}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-900">{p.name}</span>
                <span className="text-xs text-slate-500">
                  {p.applicant}
                  {p.interchangeable ? " · interchangeable" : ""} · {p.approvalYear}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      {hint ? <div className="text-[10px] text-slate-400">{hint}</div> : null}
      <div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
