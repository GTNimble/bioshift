import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { NppesContact } from "@/lib/nppesTypes";

export type { NppesContact, ContactPayload } from "@/lib/nppesTypes";
export {
  formatAddressLines,
  CONTACT_CSV_HEADERS,
  contactCsvCells,
} from "@/lib/nppesTypes";

type CacheFile = {
  source: string;
  note: string;
  updatedAt: string;
  contacts: Record<string, NppesContact>;
};

const CACHE_REL = path.join("data", "processed", "nppes_contacts.json");
const NPPES_URL = "https://npiregistry.cms.hhs.gov/api/?version=2.1&number=";
const UA = "PurpleGap/1.0 (NPPES enrichment; no secrets)";

function cachePath(): string {
  return path.join(process.cwd(), CACHE_REL);
}

function emptyCache(): CacheFile {
  return {
    source: "https://npiregistry.cms.hhs.gov/api/",
    note: "Practice location & phone from public NPPES NPI Registry. No clinician email in public API.",
    updatedAt: new Date().toISOString(),
    contacts: {},
  };
}

export function loadNppesCache(): CacheFile {
  const p = cachePath();
  if (!existsSync(p)) return emptyCache();
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as CacheFile;
    if (!raw.contacts || typeof raw.contacts !== "object") return emptyCache();
    return raw;
  } catch {
    return emptyCache();
  }
}

export function getCachedContact(npi: string): NppesContact | null {
  const c = loadNppesCache().contacts[npi];
  return c ?? null;
}

/** Prefer this in bulk exports to avoid re-reading the cache file per row. */
export function getCachedContactsMap(): Record<string, NppesContact> {
  return loadNppesCache().contacts;
}

export function saveContactToCache(contact: NppesContact): void {
  const p = cachePath();
  mkdirSync(path.dirname(p), { recursive: true });
  const cache = loadNppesCache();
  cache.contacts[contact.npi] = contact;
  cache.updatedAt = new Date().toISOString();
  writeFileSync(p, JSON.stringify(cache), "utf-8");
}

type NppesAddress = {
  address_purpose?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  telephone_number?: string;
  fax_number?: string;
};

type NppesResult = {
  number?: string;
  enumeration_type?: string;
  basic?: {
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    credential?: string;
    name_prefix?: string;
  };
  addresses?: NppesAddress[];
};

function pickPracticeAddress(addresses: NppesAddress[] | undefined): NppesAddress | null {
  if (!addresses?.length) return null;
  const loc = addresses.find((a) => (a.address_purpose || "").toUpperCase() === "LOCATION");
  return loc ?? addresses[0];
}

function str(v: string | undefined | null): string | null {
  const s = (v || "").trim();
  return s || null;
}

export function parseNppesResult(result: NppesResult, npi: string): NppesContact {
  const basic = result.basic || {};
  const addr = pickPracticeAddress(result.addresses);
  const org = str(basic.organization_name);
  const person = [basic.name_prefix, basic.first_name, basic.last_name]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .join(" ");
  return {
    npi,
    address1: str(addr?.address_1),
    address2: str(addr?.address_2),
    city: str(addr?.city),
    state: str(addr?.state),
    postalCode: str(addr?.postal_code),
    telephone: str(addr?.telephone_number),
    fax: str(addr?.fax_number),
    displayName: org || (person || null),
    enumerationType: str(result.enumeration_type),
    credential: str(basic.credential),
    refreshedAt: new Date().toISOString(),
    source: "NPPES",
  };
}

/** Live fetch once from public NPPES API. Returns null on miss/error. */
export async function fetchNppesContact(npi: string): Promise<NppesContact | null> {
  const cleaned = npi.replace(/\D/g, "");
  if (cleaned.length !== 10) return null;
  try {
    const res = await fetch(`${NPPES_URL}${cleaned}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: NppesResult[] };
    const result = data.results?.[0];
    if (!result) return null;
    return parseNppesResult(result, cleaned);
  } catch {
    return null;
  }
}

/**
 * Resolve contact for a provider: cache hit, else live fetch once + write cache.
 * Does not invent email — NPPES public API has none.
 */
export async function resolveNppesContact(npi: string): Promise<NppesContact | null> {
  const cached = getCachedContact(npi);
  if (cached) return cached;
  const live = await fetchNppesContact(npi);
  if (live) {
    try {
      saveContactToCache(live);
    } catch {
      /* cache write best-effort */
    }
  }
  return live;
}
