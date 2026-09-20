import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WatchlistsClient } from "@/components/WatchlistsClient";
import {
  computeOpportunities,
  getAlerts,
  getFamilies,
  getPurpleBookChanges,
  stateRankings,
} from "@/lib/data";

export default function WatchlistsPage() {
  const opportunities = computeOpportunities();
  const purpleChanges = getPurpleBookChanges();
  const launchAlerts = getAlerts();
  const familyOptions = getFamilies().map((f) => ({
    familyId: f.familyId,
    label: `${f.referenceBrand} (${f.ingredient})`,
  }));
  const stateOptions = stateRankings().map((s) => s.state);

  return (
    <div>
      <PageHeader
        title="Watchlists & weekly digest"
        description="Save molecules, states, and NPIs so buyers return. Matching illustrative Opportunity $ uses the same peer-gap formula as the opportunity feed. Digest is in-app / JSON only — email not sent."
        icon={<Bookmark className="h-5 w-5" />}
      />
      <WatchlistsClient
        opportunities={opportunities}
        purpleChanges={purpleChanges}
        launchAlerts={launchAlerts}
        familyOptions={familyOptions}
        stateOptions={stateOptions}
      />
    </div>
  );
}
