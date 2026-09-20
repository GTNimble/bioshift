"use client";

import { X } from "lucide-react";
import { SALES_EMAIL } from "@/lib/plans";

export function EnterpriseDemoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enterprise-demo-title"
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="enterprise-demo-title" className="text-lg font-semibold text-slate-900">
          Contact sales for Enterprise
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Enterprise includes plan–prescribing gap, unlimited list exports, API feed, and multi-seat
          rollout. If a Stripe Enterprise price is configured, you can also check out from Pricing;
          otherwise we grant the plan manually in Clerk.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Email{" "}
          <a
            href={`mailto:${SALES_EMAIL}?subject=Enterprise%20demo%20request`}
            className="font-medium text-indigo-600 hover:underline"
          >
            {SALES_EMAIL}
          </a>
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
