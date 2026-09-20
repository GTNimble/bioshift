import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  icon,
  eyebrow = "PurpleGap",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  eyebrow?: string | null;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/25">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
