import { Syringe } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LockedRoute } from "@/components/LockedRoute";
import { PartBClient } from "@/components/PartBClient";
import { loadPartB } from "@/lib/partb";

export default function PartBPage() {
  const data = loadPartB();

  return (
    <LockedRoute
      feature="prescribers"
      title="Part B practitioners require Pro"
      description="Buy-and-bill / infused biologic Part B PUF extract is included with Prescribers on Pro."
    >
      <div>
        <PageHeader
          title="Part B biologic practitioners"
          description="High Medicare FFS Part B payment NPIs for in-scope biologic HCPCS (Physician & Other Practitioners by Provider and Service). Gross Part B payments; HCPCS≠NDC; lagged annual; capped extract."
          icon={<Syringe className="h-5 w-5" />}
        />
        <PartBClient data={data} />
      </div>
    </LockedRoute>
  );
}
