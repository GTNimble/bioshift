"use client";

import type { ReactNode } from "react";
import type { SortDir } from "@/hooks/useSortableTable";

export function SortableTh<K extends string>({
  k,
  sortKey,
  sortDir,
  onSort,
  children,
  right,
  textAsc,
  className = "",
}: {
  k: K;
  sortKey: K;
  sortDir: SortDir;
  onSort: (key: K, textDefaultAsc?: boolean) => void;
  children: ReactNode;
  right?: boolean;
  /** When true, first click on this column sorts ascending (names, states). */
  textAsc?: boolean;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <th
      className={`px-3 py-3 ${right ? "text-right" : "text-left"} ${className}`}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(k, textAsc)}
        className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800"
      >
        {children}
        {active ? (
          <span className="text-indigo-600" aria-hidden>
            {sortDir === "desc" ? "↓" : "↑"}
          </span>
        ) : (
          <span className="text-slate-300" aria-hidden>
            ↕
          </span>
        )}
      </button>
    </th>
  );
}
