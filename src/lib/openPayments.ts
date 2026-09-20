import { existsSync, readFileSync } from "fs";
import path from "path";
import type { OpenPaymentsProfile } from "@/lib/openPaymentsTypes";

export type {
  OpenPaymentsProfile,
  OpenPaymentsPayload,
  OpenPaymentsCompany,
} from "@/lib/openPaymentsTypes";
export { OPEN_PAYMENTS_HONESTY } from "@/lib/openPaymentsTypes";

type CacheFile = {
  source: string;
  note: string;
  programYear: number | null;
  updatedAt: string;
  profiles: Record<string, OpenPaymentsProfile>;
};

const CACHE_REL = path.join("data", "processed", "open_payments.json");

function cachePath(): string {
  return path.join(process.cwd(), CACHE_REL);
}

function emptyCache(): CacheFile {
  return {
    source: "https://openpaymentsdata.cms.gov/",
    note: "Public CMS Open Payments. Cached for opportunity NPIs only.",
    programYear: null,
    updatedAt: new Date().toISOString(),
    profiles: {},
  };
}

export function loadOpenPaymentsCache(): CacheFile {
  const p = cachePath();
  if (!existsSync(p)) return emptyCache();
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as CacheFile;
    if (!raw.profiles || typeof raw.profiles !== "object") return emptyCache();
    return raw;
  } catch {
    return emptyCache();
  }
}

export function getOpenPaymentsProfile(npi: string): OpenPaymentsProfile | null {
  const cleaned = npi.replace(/\D/g, "");
  const map = loadOpenPaymentsCache().profiles;
  return map[cleaned] ?? map[npi] ?? null;
}

/** Prefer in bulk paths to avoid re-reading the cache file per row. */
export function getOpenPaymentsProfilesMap(): Record<string, OpenPaymentsProfile> {
  return loadOpenPaymentsCache().profiles;
}
