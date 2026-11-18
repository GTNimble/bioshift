"use client";

import { Calendar, AlertTriangle } from "lucide-react";

type KeyDate = {
  date: string;
  label: string;
  description: string;
  relevance: string;
};

const RELEVANCE_COLORS = {
  critical: "border-rose-200 bg-rose-50/80",
  high: "border-amber-200 bg-amber-50/80",
  medium: "border-sky-200 bg-sky-50/80",
};

const RELEVANCE_TEXT_COLORS = {
  critical: "text-rose-900",
  high: "text-amber-900",
  medium: "text-sky-900",
};

const RELEVANCE_ICONS = {
  critical: "text-rose-600",
  high: "text-amber-600",
  medium: "text-sky-600",
};

export function IraKeyDates({ dates }: { dates: KeyDate[] }) {
  if (!dates || dates.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-indigo-600" />
        <h3 className="text-base font-semibold text-slate-900">
          Key IRA Dates for Biosimilar Conversion
        </h3>
      </div>
      <p className="mb-4 text-xs text-slate-600">
        Medicare Inflation Reduction Act (IRA) and related CMS policy milestones
        affecting biosimilar conversion timing. All dates verified as of 2026-11-18.
      </p>
      <div className="space-y-3">
        {dates.map((d, idx) => {
          const colorClass =
            RELEVANCE_COLORS[d.relevance as keyof typeof RELEVANCE_COLORS] ||
            RELEVANCE_COLORS.medium;
          const textColorClass =
            RELEVANCE_TEXT_COLORS[
              d.relevance as keyof typeof RELEVANCE_TEXT_COLORS
            ] || RELEVANCE_TEXT_COLORS.medium;
          const iconColorClass =
            RELEVANCE_ICONS[d.relevance as keyof typeof RELEVANCE_ICONS] ||
            RELEVANCE_ICONS.medium;

          return (
            <div
              key={idx}
              className={`flex gap-3 rounded-lg border p-3 ${colorClass}`}
            >
              <div className="flex-shrink-0">
                {d.relevance === "critical" && (
                  <AlertTriangle className={`h-5 w-5 ${iconColorClass}`} />
                )}
                {d.relevance !== "critical" && (
                  <Calendar className={`h-5 w-5 ${iconColorClass}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span
                    className={`text-sm font-semibold tabular-nums ${textColorClass}`}
                  >
                    {d.date}
                  </span>
                  <span className={`text-xs font-medium ${textColorClass}`}>
                    {d.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {d.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
