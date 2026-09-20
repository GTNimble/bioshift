import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LockedRoute } from "@/components/LockedRoute";
import { AccountsClient } from "@/components/AccountsClient";
import { getEnrollmentGroupsLive, loadEnrollment } from "@/lib/enrollment";

export default function AccountsPage({
  searchParams,
}: {
  searchParams?: { group?: string };
}) {
  const file = loadEnrollment();
  const groups = getEnrollmentGroupsLive();
  const initialGroupId = searchParams?.group?.trim() || null;

  return (
    <LockedRoute
      feature="prescribers"
      title="Accounts / groups require Pro"
      description="Enrollment-based group rollups of Opportunity $ are included with Prescribers on Pro."
    >
      <div>
        <PageHeader
          title="Accounts / groups"
          description="Roll up illustrative Opportunity $ and peer gaps across NPIs sharing a CMS Public Provider Enrollment association (or org name). PECOS-adjacent — not a full reassignment hierarchy. Click a group for member NPIs; open a member for Part D detail."
          icon={<Building2 className="h-5 w-5" />}
        />
        <AccountsClient
          groups={groups}
          honesty={file.honesty}
          updatedAt={file.updatedAt}
          initialGroupId={initialGroupId}
        />
      </div>
    </LockedRoute>
  );
}
