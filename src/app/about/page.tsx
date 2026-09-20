import { Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { OpportunityFormula } from "@/components/OpportunityFormula";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About PurpleGap"
        description="Medicare Part D biosimilar conversion intelligence for PBM formulary and plan teams."
        icon={<Info className="h-5 w-5" />}
      />

      <div className="prose prose-slate max-w-none space-y-8 text-sm text-slate-700">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Product pitch</h2>
          <p className="mt-2 leading-relaxed">
            PurpleGap helps pharmacy benefit managers and Part D plan formulary teams find where
            reference biologics still dominate prescribing — and where biosimilar conversion can
            reduce gross drug cost. It joins CMS Part D prescribing patterns with FDA Purple
            Book biosimilar linkages, then ranks NPIs by illustrative Opportunity $ (brand gross × peer biosimilar gap).
          </p>
          <p className="mt-2 leading-relaxed">
            Buyers: PBM formulary strategy, Part D plan pharmacy leadership, specialty pharmacy
            account teams, and biosimilar manufacturer market-access / field analytics partners
            (read-only opportunity packs).
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Illustrative Opportunity $</h2>
          <div className="mt-3">
            <OpportunityFormula />
          </div>
          <p className="mt-3 leading-relaxed">
            Higher Opportunity $ flags providers with large brand spend who lag peers on biosimilar
            share (same specialty + state when ≥3 peers, else family-level). Peer gap (pp) is
            floored at zero so providers already ahead of peers show $0. Documented in-product for
            buyer trust — figures are illustrative gross Part D, not net of rebates/DIR.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Data sources</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              CMS Medicare Part D Prescribers by Provider and Drug (CY2024 PUF):{" "}
              <a
                className="font-medium text-indigo-600 hover:underline"
                href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers"
                target="_blank"
                rel="noreferrer"
              >
                data.cms.gov — Part D prescribers
              </a>
            </li>
            <li>
              FDA Purple Book downloads:{" "}
              <a
                className="font-medium text-indigo-600 hover:underline"
                href="https://purplebooksearch.fda.gov/downloads"
                target="_blank"
                rel="noreferrer"
              >
                purplebooksearch.fda.gov/downloads
              </a>
            </li>
            <li>
              Active feed is real CMS rows filtered to biosimilar-relevant molecules (see{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">data/processed/meta.json</code> and{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">scripts/ingest/README.md</code>).
              Sample seed remains under <code className="rounded bg-slate-100 px-1 text-xs">data/sample/</code>.
            </li>
          </ul>
          <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-950">
            <strong>REAL CMS PUF (filtered).</strong> Not a full national dump — limited to
            biosimilar-relevant molecules and top opportunity NPIs per family. Gross cost only;
            do not cite as official CMS published statistics without checking source files.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Limitations & compliance notes</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Gross cost only:</strong> CMS Tot_Drug_Cst is gross drug cost, not net of
              rebates, DIR, or manufacturer discounts. Conversion economics need rebate overlays.
            </li>
            <li>
              <strong>Name / family matching:</strong> Product identity uses CMS brand/generic names
              joined to Purple Book proprietary/proper names (no NDC in this Part D PUF).
            </li>
            <li>
              <strong>Part B gap:</strong> Many biologics (esp. oncology, ophthalmology buy-and-bill)
              are Part B dominant. This MVP is Part D–oriented and understates full biologic spend.
            </li>
            <li>
              <strong>Matching confidence:</strong> Brand ↔ biosimilar linkage uses Purple Book
              license type + CMS Gnrc_Name biosimilar suffixes; review queues still recommended.
            </li>
            <li>
              <strong>Formulary PUF T&Cs:</strong> CMS formulary public use files have restrictive
              terms — do not redistribute raw formulary PUF without review. Gap module here uses
              demo plan preferences only (not CMS formulary PUF).
            </li>
            <li>
              Not medical advice; not an endorsement of any product; not affiliated with CMS or FDA.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Monetization modules</h2>
          <p className="mt-2">
            See{" "}
            <Link href="/monetize" className="font-medium text-indigo-600 hover:underline">
              Pricing & Packs
            </Link>{" "}
            for opportunity feed CSV, plan–prescribing gap stub, launch alerts, territory packs, and
            illustrative SaaS pricing.
          </p>
        </section>
      </div>
    </div>
  );
}
