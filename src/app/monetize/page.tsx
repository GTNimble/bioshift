import { Package } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MonetizeClient } from "@/components/MonetizeClient";
import { LockedRoute } from "@/components/LockedRoute";
import {
  getPlans,
  planGapAnalysis,
  computeOpportunities,
  getFamilies,
} from "@/lib/data";

export default function MonetizePage() {
  const plans = getPlans();
  const gapsByPlan: Record<string, NonNullable<ReturnType<typeof planGapAnalysis>>> = {};
  for (const p of plans) {
    const g = planGapAnalysis(p.planId);
    if (g) gapsByPlan[p.planId] = g;
  }
  const opps = computeOpportunities();
  const states = Array.from(new Set(opps.map((o) => o.state))).sort();
  const specialties = Array.from(new Set(opps.map((o) => o.specialty))).sort();
  const families = getFamilies().map((f) => ({
    familyId: f.familyId,
    referenceBrand: f.referenceBrand,
  }));

  return (
    <LockedRoute
      feature="monetize"
      title="Pricing & packs require Pro"
      description="Upgrade to Pro for territory packs and limited opportunity CSV. Enterprise unlocks unlimited list exports (opportunity, territory, family, NPI), plan–prescribing gap, and API feed."
    >
      <div>
        <PageHeader
          title="Packaging & pricing for PBM buyers"
          description="All five monetization modules in one place: opportunity feed, plan–prescribing gap, launch alerts, territory packs, and illustrative SaaS pricing."
          icon={<Package className="h-5 w-5" />}
        />
        <MonetizeClient
          plans={plans}
          gapsByPlan={gapsByPlan}
          states={states}
          specialties={specialties}
          families={families}
        />
      </div>
    </LockedRoute>
  );
}
