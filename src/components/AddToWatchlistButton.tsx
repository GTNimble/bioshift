"use client";

import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronDown } from "lucide-react";
import { useWatchlists } from "@/components/WatchlistProvider";
import type { WatchEntityType } from "@/lib/watchlists/types";

export function AddToWatchlistButton({
  type,
  value,
  label,
  className = "",
}: {
  type: WatchEntityType;
  value: string;
  label: string;
  className?: string;
}) {
  const { ready, bundle, addItem, isWatched, limits } = useWatchlists();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const watched = isWatched(type, value);

  const lists = bundle.lists;

  const hint = useMemo(() => {
    if (lists.length === 0) return "Creates a default list if none exist";
    return `${lists.length}/${limits.maxLists} lists`;
  }, [lists.length, limits.maxLists]);

  function onAdd(listId?: string) {
    const res = addItem({ type, value, label, listId });
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setMsg(`Saved to watchlist`);
    setOpen(false);
    setTimeout(() => setMsg(null), 2000);
  }

  if (!ready) return null;

  return (
    <div className={`relative inline-flex flex-col items-start gap-1 ${className}`}>
      <div className="inline-flex rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => onAdd(lists[0]?.id)}
          className={`inline-flex items-center gap-1.5 rounded-l-md border px-2.5 py-1.5 text-xs font-medium ${
            watched
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          title={hint}
        >
          {watched ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {watched ? "Watching" : "Add to watchlist"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center rounded-r-md border border-l-0 border-slate-200 bg-white px-1.5 py-1.5 text-slate-600 hover:bg-slate-50"
          aria-label="Choose watchlist"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[12rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {lists.length === 0 ? (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => onAdd()}
            >
              Create “My watchlist” & add
            </button>
          ) : (
            lists.map((l) => (
              <button
                key={l.id}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => onAdd(l.id)}
              >
                {l.name}
                <span className="ml-1 text-slate-400">
                  ({l.items.length}/{limits.maxItemsPerList})
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
      {msg ? <span className="text-[11px] text-slate-500">{msg}</span> : null}
    </div>
  );
}
