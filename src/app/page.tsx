import Image from "next/image";
import Link from "next/link";
import {
  DollarSign,
  Users,
  Pill,
  TrendingUp,
  Bell,
  Map,
  GitCompare,
  LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { OpportunityFormula } from "@/components/OpportunityFormula";
import { OverviewActions, TopOpportunitiesTable } from "@/components/OverviewClient";
import { OverviewCharts } from "@/components/OverviewCharts";
import { SectionCard } from "@/components/ui/SectionCard";
import { getKpis } from "@/lib/data";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";

export default function OverviewPage() {
  const kpis = getKpis();

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 shadow-sm ring-1 ring-slate-900/[0.03]">
        <div className="grid items-center gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Conversion intelligence
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Spot high brand / low biosimilar Part D opportunities
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              PurpleGap surfaces peer-gap Opportunity $ from CMS Part D CY2024 (filtered) joined to
              FDA Purple Book — built for PBM formulary and plan teams. Figures are{" "}
              <span className="font-medium text-slate-800">gross Part D</span>, not net of
              rebates/DIR.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
            <Image
              src="/illustrations/hero-data.svg"
              alt="Abstract Part D mix charts and network nodes — product illustration, no identifiable people"
              width={640}
              height={360}
              className="h-auto w-full"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>

      <PageHeader
        title="Overview"
        description="Identify high brand / low biosimilar Part D prescribing opportunities for formulary and PBM teams. CMS Part D Prescribers CY2024 filtered to biosimilar-relevant molecules joined to FDA Purple Book."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={<OverviewActions />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Illustrative Opportunity $"
          value={formatUsd(kpis.totalOpportunity, true)}
          sub="Σ brand_gross × peer gap (floored at 0)"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="indigo"
        />
        <KpiCard
          label="Brand drug cost (gross)"
          value={formatUsd(kpis.totalBrandCost, true)}
          sub="Across provider × family brand rows"
          icon={<DollarSign className="h-5 w-5" />}
          tone="slate"
        />
        <KpiCard
          label="Providers (filtered)"
          value={formatNumber(kpis.uniqueNpis)}
          sub={`${formatNumber(kpis.rowCount)} provider×drug rows`}
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
        <KpiCard
          label="Molecule families"
          value={String(kpis.familyCount)}
          sub={`Avg biosimilar share ${formatPct(kpis.avgBioShare)}`}
          icon={<Pill className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <OverviewCharts
        data={{
          brandShare: kpis.brandShare,
          bioShare: kpis.bioShare,
          topStates: kpis.topStates,
          topFamilies: kpis.topFamilies,
        }}
      />

      <OpportunityFormula className="mb-6" />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Top opportunities</h2>
        <Link href="/prescribers" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          View all →
        </Link>
      </div>

      <TopOpportunitiesTable rows={kpis.topOpportunities} />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/alerts",
            title: "Purple Book alerts",
            body: "Monthly FDA Purple Book N/R/U changelog for tracked families (not a live approvals feed).",
            icon: <Bell className="h-4 w-4" />,
          },
          {
            href: "/monetize",
            title: "Territory packs",
            body: "State / specialty filtered NPI exports for field teams.",
            icon: <Map className="h-4 w-4" />,
          },
          {
            href: "/monetize",
            title: "Plan–prescribing gap",
            body: "Compare formulary preferred biosimilar vs actual mix.",
            icon: <GitCompare className="h-4 w-4" />,
          },
        ].map((c) => (
          <Link key={c.title} href={c.href} className="group block">
            <SectionCard className="h-full transition group-hover:border-indigo-200 group-hover:shadow-md">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  {c.icon}
                </span>
                <h3 className="font-semibold text-slate-900">{c.title}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.body}</p>
            </SectionCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
