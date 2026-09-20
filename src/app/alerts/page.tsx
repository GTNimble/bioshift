import { Bell } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AlertsClient } from "@/components/AlertsClient";
import { getAlerts, getFamilies, getPurpleChangelog } from "@/lib/data";

export default function AlertsPage() {
  const changelog = getPurpleChangelog();
  const launchAlerts = getAlerts();
  const families = getFamilies().map((f) => ({
    familyId: f.familyId,
    label: `${f.referenceBrand} (${f.ingredient})`,
  }));

  return (
    <div>
      <PageHeader
        title="Purple Book alerts"
        description="Monthly FDA Purple Book changelog for tracked molecule families, plus launch/conversion signals from Purple Book + filtered CMS Part D. Not a live FDA push feed."
        icon={<Bell className="h-5 w-5" />}
      />
      <AlertsClient
        changelog={changelog}
        launchAlerts={launchAlerts}
        families={families}
      />
    </div>
  );
}
