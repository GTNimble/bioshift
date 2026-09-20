import { Factory } from "lucide-react";
import { loadPartDSpend } from "@/lib/partdSpend";
import { PageHeader } from "@/components/PageHeader";
import { LockedRoute } from "@/components/LockedRoute";
import { MakerShareClient } from "@/components/MakerShareClient";
import { buildMakerSharePacks } from "@/lib/makerShare";

export default function MakersPage() {
  const packs = buildMakerSharePacks();
  const partDSpend = loadPartDSpend();

  return (
    <LockedRoute
      feature="maker_share_pack"
      title="Maker share packs require Pro"
      description="Competitive brand vs biosimilar Part D share, top brand-heavy NPIs, and state concentration — built for biosimilar manufacturers entering the US. Upgrade to Pro to unlock."
    >
      <div>
        <PageHeader
          title="Maker competitive share packs"
          description="For biosimilar manufacturers & BD (ex-US → US): brand vs biosimilar Part D claims mix by molecule family, top brand-heavy NPIs, illustrative opportunity $, and state concentration. Gross Part D only — not net of rebates/DIR."
          icon={<Factory className="h-5 w-5" />}
        />
        <MakerShareClient packs={packs} partDSpend={partDSpend} />
      </div>
    </LockedRoute>
  );
}
