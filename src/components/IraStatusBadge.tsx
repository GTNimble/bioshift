"use client";

import { useState } from "react";
import type { IraStatusTag, IraStatusType } from "@/lib/types";
import { ExternalLink } from "lucide-react";

const IRA_STATUS_COLORS: Record<
  IraStatusType,
  { bg: string; text: string; border: string }
> = {
  NEGOTIATED: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  SELECTED_2028: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  ASP_PLUS_8: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  GLOBE_EXCLUDED_WITH_BIOSIMILAR: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
};

export function IraStatusBadge({ tag }: { tag: IraStatusTag }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = IRA_STATUS_COLORS[tag.type];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition hover:shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {tag.shortLabel}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-1 font-semibold text-slate-900">{tag.title}</div>
          <div className="mb-2 text-xs leading-relaxed text-slate-700">
            {tag.detail}
          </div>
          {tag.timing_note && (
            <div className="mb-2 rounded border border-indigo-100 bg-indigo-50/50 p-2 text-xs italic text-indigo-900">
              {tag.timing_note}
            </div>
          )}
          {(tag.startDate || tag.endDate) && (
            <div className="mb-1 text-xs text-slate-600">
              {tag.startDate && (
                <div>
                  <span className="font-medium">Start:</span> {tag.startDate}
                </div>
              )}
              {tag.endDate && (
                <div>
                  <span className="font-medium">End:</span> {tag.endDate}
                </div>
              )}
            </div>
          )}
          <a
            href={tag.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            <ExternalLink className="h-3 w-3" />
            CMS source
          </a>
          <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
            Verified 2026-11-18
          </div>
        </div>
      )}
    </div>
  );
}

export function IraStatusBadges({ tags }: { tags?: IraStatusTag[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag, idx) => (
        <IraStatusBadge key={`${tag.type}-${idx}`} tag={tag} />
      ))}
    </div>
  );
}
