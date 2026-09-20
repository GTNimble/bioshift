"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  emptyWatchlistBundle,
  newWatchItemId,
  newWatchlistId,
  type WatchEntityType,
  type WatchItem,
  type Watchlist,
  type WatchlistBundle,
} from "@/lib/watchlists/types";
import { getWatchlistLimits, type WatchlistLimits } from "@/lib/watchlists/limits";
import {
  readLocalWatchlists,
  writeLocalWatchlists,
} from "@/lib/watchlists/clientStore";
import type { PlanId } from "@/lib/plans";

type AddItemInput = {
  type: WatchEntityType;
  value: string;
  label: string;
  listId?: string;
};

type WatchlistContextValue = {
  ready: boolean;
  bundle: WatchlistBundle;
  limits: WatchlistLimits;
  persistence: "local" | "file" | "clerk";
  syncError: string | null;
  createList: (name: string) => { ok: true; list: Watchlist } | { ok: false; error: string };
  renameList: (listId: string, name: string) => { ok: true } | { ok: false; error: string };
  deleteList: (listId: string) => void;
  addItem: (input: AddItemInput) => { ok: true; item: WatchItem; listId: string } | { ok: false; error: string };
  removeItem: (listId: string, itemId: string) => void;
  isWatched: (type: WatchEntityType, value: string) => boolean;
  refreshFromServer: () => Promise<void>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function defaultLimits(plan: PlanId | undefined): WatchlistLimits {
  return getWatchlistLimits(plan ?? "free");
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady, mode } = useAuth();
  const [bundle, setBundle] = useState<WatchlistBundle>(emptyWatchlistBundle);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<"local" | "file" | "clerk">("local");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPersist = useRef(false);

  const limits = useMemo(
    () => defaultLimits(session?.plan),
    [session?.plan]
  );

  const persistServer = useCallback(async (next: WatchlistBundle) => {
    try {
      const res = await fetch("/api/watchlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: next }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSyncError(err.error || `Save failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as {
        bundle: WatchlistBundle;
        limits?: WatchlistLimits;
      };
      setSyncError(null);
      skipNextPersist.current = true;
      setBundle(data.bundle);
      writeLocalWatchlists(data.bundle);
    } catch {
      setSyncError("Could not sync watchlists to server (local copy kept).");
    }
  }, []);

  const commit = useCallback(
    (updater: (prev: WatchlistBundle) => WatchlistBundle) => {
      setBundle((prev) => {
        const next = updater(prev);
        const stamped: WatchlistBundle = {
          ...next,
          version: 1,
          updatedAt: new Date().toISOString(),
        };
        writeLocalWatchlists(stamped);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void persistServer(stamped);
        }, 400);
        return stamped;
      });
    },
    [persistServer]
  );

  const refreshFromServer = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/watchlists");
      if (!res.ok) {
        setPersistence("local");
        return;
      }
      const data = (await res.json()) as {
        bundle: WatchlistBundle;
        persistence?: "file" | "clerk";
      };
      const local = readLocalWatchlists();
      const serverTime = Date.parse(data.bundle.updatedAt || "") || 0;
      const localTime = Date.parse(local.updatedAt || "") || 0;
      // Prefer newer; if server empty and local has data, push local up
      if (local.lists.length > 0 && (data.bundle.lists.length === 0 || localTime > serverTime)) {
        skipNextPersist.current = true;
        setBundle(local);
        setPersistence(data.persistence ?? (mode === "clerk" ? "clerk" : "file"));
        await persistServer(local);
      } else {
        skipNextPersist.current = true;
        setBundle(data.bundle);
        writeLocalWatchlists(data.bundle);
        setPersistence(data.persistence ?? (mode === "clerk" ? "clerk" : "file"));
      }
      setSyncError(null);
    } catch {
      setPersistence("local");
    }
  }, [session, mode, persistServer]);

  useEffect(() => {
    if (!authReady) return;
    const local = readLocalWatchlists();
    setBundle(local);
    setReady(true);
    if (session) {
      void refreshFromServer();
    }
  }, [authReady, session?.email, session?.plan, refreshFromServer, session]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
    }
  }, [bundle]);

  const createList = useCallback(
    (name: string) => {
      if (bundle.lists.length >= limits.maxLists) {
        return {
          ok: false as const,
          error: `Plan limit: ${limits.maxLists} watchlist${limits.maxLists === 1 ? "" : "s"}. Upgrade for more.`,
        };
      }
      const trimmed = name.trim() || "My watchlist";
      const now = new Date().toISOString();
      const list: Watchlist = {
        id: newWatchlistId(),
        name: trimmed.slice(0, 80),
        createdAt: now,
        updatedAt: now,
        items: [],
      };
      commit((prev) => ({ ...prev, lists: [...prev.lists, list] }));
      return { ok: true as const, list };
    },
    [bundle.lists.length, limits.maxLists, commit]
  );

  const renameList = useCallback(
    (listId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false as const, error: "Name required" };
      commit((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId
            ? { ...l, name: trimmed.slice(0, 80), updatedAt: new Date().toISOString() }
            : l
        ),
      }));
      return { ok: true as const };
    },
    [commit]
  );

  const deleteList = useCallback(
    (listId: string) => {
      commit((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== listId),
      }));
    },
    [commit]
  );

  const addItem = useCallback(
    (input: AddItemInput) => {
      const now = new Date().toISOString();
      const item: WatchItem = {
        id: newWatchItemId(),
        type: input.type,
        value: input.value,
        label: input.label,
        addedAt: now,
      };

      // Resolve target list synchronously against current bundle
      let lists = bundle.lists;
      let listId = input.listId;
      let createdList: Watchlist | null = null;

      if (!listId) {
        if (lists.length === 0) {
          if (lists.length >= limits.maxLists) {
            return { ok: false as const, error: "Watchlists unavailable on this plan." };
          }
          createdList = {
            id: newWatchlistId(),
            name: "My watchlist",
            createdAt: now,
            updatedAt: now,
            items: [],
          };
          lists = [...lists, createdList];
          listId = createdList.id;
        } else {
          listId = lists[0].id;
        }
      }

      const existing = lists.find((l) => l.id === listId);
      if (!existing) {
        return { ok: false as const, error: "Watchlist not found" };
      }
      if (
        existing.items.some(
          (i) => i.type === input.type && i.value.toLowerCase() === input.value.toLowerCase()
        )
      ) {
        return { ok: false as const, error: "Already on this watchlist" };
      }
      if (existing.items.length >= limits.maxItemsPerList) {
        return {
          ok: false as const,
          error: `Plan limit: ${limits.maxItemsPerList} items per list. Upgrade for more.`,
        };
      }
      if (createdList && bundle.lists.length >= limits.maxLists) {
        return {
          ok: false as const,
          error: `Plan limit: ${limits.maxLists} watchlist${limits.maxLists === 1 ? "" : "s"}. Upgrade for more.`,
        };
      }

      const targetId = listId;
      commit((prev) => {
        let nextLists = prev.lists;
        if (createdList && !nextLists.some((l) => l.id === createdList!.id)) {
          if (nextLists.length >= limits.maxLists) return prev;
          nextLists = [...nextLists, createdList];
        }
        return {
          ...prev,
          lists: nextLists.map((l) =>
            l.id === targetId
              ? {
                  ...l,
                  items: l.items.some(
                    (i) =>
                      i.type === input.type &&
                      i.value.toLowerCase() === input.value.toLowerCase()
                  )
                    ? l.items
                    : [...l.items, item],
                  updatedAt: now,
                }
              : l
          ),
        };
      });
      return { ok: true as const, item, listId: targetId };
    },
    [bundle.lists, limits, commit]
  );

  const removeItem = useCallback(
    (listId: string, itemId: string) => {
      commit((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.filter((i) => i.id !== itemId),
                updatedAt: new Date().toISOString(),
              }
            : l
        ),
      }));
    },
    [commit]
  );

  const isWatched = useCallback(
    (type: WatchEntityType, value: string) => {
      const v = value.toLowerCase();
      return bundle.lists.some((l) =>
        l.items.some((i) => i.type === type && i.value.toLowerCase() === v)
      );
    },
    [bundle.lists]
  );

  const value = useMemo(
    () => ({
      ready,
      bundle,
      limits,
      persistence,
      syncError,
      createList,
      renameList,
      deleteList,
      addItem,
      removeItem,
      isWatched,
      refreshFromServer,
    }),
    [
      ready,
      bundle,
      limits,
      persistence,
      syncError,
      createList,
      renameList,
      deleteList,
      addItem,
      removeItem,
      isWatched,
      refreshFromServer,
    ]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlists(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlists must be used within WatchlistProvider");
  }
  return ctx;
}
