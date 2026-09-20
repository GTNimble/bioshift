import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PrescriberTable } from "@/components/PrescriberTable";
import { LockedRoute } from "@/components/LockedRoute";
import { computeOpportunities } from "@/lib/data";
import { getOpenPaymentsProfilesMap } from "@/lib/openPayments";
import { getEnrollmentLinksByNpi } from "@/lib/enrollment";

export default function PrescribersPage({
  searchParams,
}: {
  searchParams?: { group?: string; hasAccount?: string };
}) {
  const opportunities = computeOpportunities();
  const openPaymentsByNpi = getOpenPaymentsProfilesMap();
  const enrollmentByNpi = getEnrollmentLinksByNpi();
  const initialGroupId = searchParams?.group?.trim() || null;
  const initialHasAccount =
    Boolean(initialGroupId) ||
    ["1", "true", "yes"].includes((searchParams?.hasAccount || "").toLowerCase());

  return (
    <LockedRoute
      feature="prescribers"
      title="Prescriber feed is a Pro feature"
      description="Upgrade to Pro to search, filter, and export the full NPI opportunity feed."
    >
      <div>
        <PageHeader
          title="Opportunity feed — prescribers"
          description="NPI-level brand / biosimilar mix with illustrative Opportunity $ and peer gap from real CMS Part D CY2024 rows (filtered). Open Payments score/flags and PECOS/account links join when cached (Pro)."
          icon={<Users className="h-5 w-5" />}
        />
        <PrescriberTable
          opportunities={opportunities}
          openPaymentsByNpi={openPaymentsByNpi}
          enrollmentByNpi={enrollmentByNpi}
          initialGroupId={initialGroupId}
          initialHasAccount={initialHasAccount}
        />
      </div>
    </LockedRoute>
  );
}
