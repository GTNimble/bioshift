import { Pill } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DrugsClient } from "@/components/DrugsClient";
import { loadPartDSpend } from "@/lib/partdSpend";
import { familyConversionStats } from "@/lib/data";
import { LockedRoute } from "@/components/LockedRoute";

export default function DrugsPage({
  searchParams,
}: {
  searchParams?: { family?: string };
}) {
  const stats = familyConversionStats();
  const partDSpend = loadPartDSpend();
  const initialFamilyId = searchParams?.family?.trim() || null;

  return (
    <LockedRoute
      feature="drugs"
      title="Drugs explorer is a Pro feature"
      description="Free plan includes Overview and About only. Upgrade to Pro for drug families, biosimilar linkages, and conversion charts."
    >
      <div>
        <PageHeader
          title="Drug families & biosimilar linkages"
          description="FDA Purple Book reference → biosimilar map with CMS Part D CY2024 prescribing mix (filtered molecules). Click a family for brand/biosimilar mix and top opportunity NPIs."
          icon={<Pill className="h-5 w-5" />}
        />
        <DrugsClient stats={stats} initialFamilyId={initialFamilyId} partDSpend={partDSpend} />
      </div>
    </LockedRoute>
  );
}
