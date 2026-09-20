import { OPPORTUNITY_HONESTY } from "@/lib/types";

export function OpportunityFormula({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900 ${className}`}
      title="Illustrative Opportunity $ = brand_gross_spend × max(0, peer_biosimilar_share − this_NPI_biosimilar_share). Peer = mean share among specialty+state peers (≥3) else family-level peers."
    >
      <div>
        <span className="font-semibold">Illustrative Opportunity $:</span>{" "}
        <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px]">
          brand_gross × max(0, peer_bio_share − this_bio_share)
        </code>
      </div>
      <span className="mt-1 block text-indigo-800/80">
        Peer biosimilar share = mean of other providers in the same specialty + state (≥3 peers)
        for that molecule family; else mean of other family-level peers.{" "}
        <span className="font-medium">Peer gap (pp)</span> = that difference × 100.
      </span>
      <span className="mt-1.5 block font-medium text-amber-900/90">{OPPORTUNITY_HONESTY}</span>
    </div>
  );
}

/** Compact honesty line for drawers / table footers */
export function OpportunityHonesty({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-snug text-amber-800/90 ${className}`}>{OPPORTUNITY_HONESTY}</p>
  );
}
