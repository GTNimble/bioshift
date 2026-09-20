import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: "indigo" | "slate" | "emerald" | "violet" | "amber";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/[0.04]"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          {sub ? <p className="mt-1.5 text-xs leading-snug text-slate-500">{sub}</p> : null}
        </div>
        {icon ? (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tones[tone]}`}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
