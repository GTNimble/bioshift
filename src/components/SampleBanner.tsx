import { DATA_BANNER } from "@/lib/data";

/** Top-of-app honesty banner for active CMS + Purple Book extract. */
export function SampleBanner() {
  return (
    <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-xs font-medium text-sky-950 sm:text-sm">
      {DATA_BANNER}. Gross Part D costs; beneficiary counts may be CMS-suppressed.
    </div>
  );
}
