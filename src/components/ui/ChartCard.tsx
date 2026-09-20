import type { ReactNode } from "react";
import { SectionCard } from "@/components/ui/SectionCard";

export function ChartCard({
  title,
  description,
  honesty,
  icon,
  actions,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  /** Short honesty / caveat line (e.g. gross Part D) */
  honesty?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SectionCard className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                {icon}
              </span>
            ) : null}
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          </div>
          {description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
          {honesty ? (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {honesty}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </SectionCard>
  );
}
