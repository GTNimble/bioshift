"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export type SortAccessor<T, K extends string> = (row: T, key: K) => string | number | null | undefined;

function compareValues(av: string | number | null | undefined, bv: string | number | null | undefined, dir: SortDir): number {
  const aNull = av == null || av === "";
  const bNull = bv == null || bv === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (typeof av === "number" && typeof bv === "number") {
    return dir === "desc" ? bv - av : av - bv;
  }
  const as = String(av);
  const bs = String(bv);
  return dir === "desc" ? bs.localeCompare(as) : as.localeCompare(bs);
}

/**
 * Generic client-side sort for list tables.
 * Pass an optional accessor when the sort key is not a direct property of T.
 */
export function useSortableTable<T, K extends string>(
  rows: T[],
  defaultKey: K,
  defaultDir: SortDir = "desc",
  accessor?: SortAccessor<T, K>
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggleSort = useCallback(
    (key: K, textDefaultAsc = false) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortKey(key);
        setSortDir(textDefaultAsc ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  const sorted = useMemo(() => {
    const get = accessor
      ? (row: T) => accessor(row, sortKey)
      : (row: T) => (row as Record<string, unknown>)[sortKey] as string | number | null | undefined;
    return [...rows].sort((a, b) => compareValues(get(a), get(b), sortDir));
  }, [rows, sortKey, sortDir, accessor]);

  return { sorted, sortKey, sortDir, toggleSort, setSortKey, setSortDir };
}
