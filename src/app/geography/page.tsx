import { MapPinned } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { GeographyClient } from "@/components/GeographyClient";
import { stateRankings } from "@/lib/data";
import { LockedRoute } from "@/components/LockedRoute";

export default function GeographyPage() {
  const rankings = stateRankings();

  return (
    <LockedRoute
      feature="geography"
      title="Geography is a Pro feature"
      description="Upgrade to Pro for state rankings and territory-oriented exports."
    >
      <div>
        <PageHeader
          title="Geography — state ranking"
          description="Aggregate illustrative Opportunity $ by state from filtered CMS Part D CY2024 provider×drug rows. Click a state for top NPIs and families. Unlimited list exports are Enterprise."
          icon={<MapPinned className="h-5 w-5" />}
        />
        <GeographyClient rankings={rankings} />
      </div>
    </LockedRoute>
  );
}
