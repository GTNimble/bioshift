"use client";

import type { ReactNode } from "react";

export function FilterBar({
  children,
  trailing,
  hint,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      {trailing ? <div className="flex flex-wrap gap-2">{trailing}</div> : null}
      {hint ? <p className="w-full text-xs text-slate-500 lg:order-last">{hint}</p> : null}
    </div>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const filterInputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export const filterSelectClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm";
