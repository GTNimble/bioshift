#!/usr/bin/env python3
"""Enrich unique NPIs from data/prescribers.json via public NPPES NPI Registry API.

Writes data/processed/nppes_contacts.json keyed by NPI (resume-safe).
No secrets required. Does not invent emails — public API has none.

Examples:
  # Top ~200 opportunity NPIs (by brand Tot_Drug_Cst) — default demo seed
  python3 scripts/ingest/enrich_nppes_contacts.py --limit 200

  # Full refresh of every unique NPI in the feed (polite rate limit)
  python3 scripts/ingest/enrich_nppes_contacts.py --all

  # Force re-fetch even if cached
  python3 scripts/ingest/enrich_nppes_contacts.py --limit 50 --force
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRESCRIBERS = ROOT / "data" / "prescribers.json"
OUT = ROOT / "data" / "processed" / "nppes_contacts.json"
NPPES_URL = "https://npiregistry.cms.hhs.gov/api/?version=2.1&number={npi}"
UA = "PurpleGap-ingest/1.0 (+NPPES public enrichment; no secrets)"


def load_cache() -> dict:
    if OUT.exists():
        try:
            return json.loads(OUT.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {
        "source": "https://npiregistry.cms.hhs.gov/api/",
        "note": (
            "Practice location & phone from public NPPES NPI Registry. "
            "No clinician email in public API. Outreach subject to TCPA."
        ),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "contacts": {},
    }


def save_cache(cache: dict) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cache["updatedAt"] = datetime.now(timezone.utc).isoformat()
    OUT.write_text(json.dumps(cache), encoding="utf-8")


def ranked_npis(limit: int | None) -> list[str]:
    """Rank unique NPIs by brand Tot_Drug_Cst (proxy for opportunity weight)."""
    data = json.loads(PRESCRIBERS.read_text(encoding="utf-8"))
    rows = data.get("rows") or []
    brand_cost: dict[str, float] = defaultdict(float)
    for r in rows:
        npi = str(r.get("npi") or "").strip()
        if not npi:
            continue
        if r.get("isBrand"):
            try:
                brand_cost[npi] += float(r.get("Tot_Drug_Cst") or 0)
            except (TypeError, ValueError):
                brand_cost[npi] += 0.0
        else:
            brand_cost.setdefault(npi, brand_cost.get(npi, 0.0))
    ordered = sorted(brand_cost.keys(), key=lambda n: brand_cost[n], reverse=True)
    if limit is not None:
        return ordered[:limit]
    return ordered


def pick_location(addresses: list[dict]) -> dict | None:
    if not addresses:
        return None
    for a in addresses:
        if str(a.get("address_purpose") or "").upper() == "LOCATION":
            return a
    return addresses[0]


def s(v) -> str | None:
    t = str(v or "").strip()
    return t or None


def parse_result(result: dict, npi: str) -> dict:
    basic = result.get("basic") or {}
    addr = pick_location(result.get("addresses") or []) or {}
    org = s(basic.get("organization_name"))
    person_parts = [
        s(basic.get("name_prefix")),
        s(basic.get("first_name")),
        s(basic.get("last_name")),
    ]
    person = " ".join(p for p in person_parts if p) or None
    return {
        "npi": npi,
        "address1": s(addr.get("address_1")),
        "address2": s(addr.get("address_2")),
        "city": s(addr.get("city")),
        "state": s(addr.get("state")),
        "postalCode": s(addr.get("postal_code")),
        "telephone": s(addr.get("telephone_number")),
        "fax": s(addr.get("fax_number")),
        "displayName": org or person,
        "enumerationType": s(result.get("enumeration_type")),
        "credential": s(basic.get("credential")),
        "refreshedAt": datetime.now(timezone.utc).isoformat(),
        "source": "NPPES",
    }


def fetch_npi(npi: str, timeout: float = 30.0) -> dict | None:
    url = NPPES_URL.format(npi=npi)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! {npi} fetch error: {e}", flush=True)
        return None
    results = payload.get("results") or []
    if not results:
        return None
    return parse_result(results[0], npi)


def main() -> int:
    ap = argparse.ArgumentParser(description="Enrich NPIs via public NPPES API")
    ap.add_argument("--limit", type=int, default=200, help="Max NPIs to enrich (default 200)")
    ap.add_argument("--all", action="store_true", help="Enrich every unique NPI in prescribers.json")
    ap.add_argument("--force", action="store_true", help="Re-fetch even if already cached")
    ap.add_argument(
        "--rate",
        type=float,
        default=8.0,
        help="Max requests per second (default 8; stay polite, ≤10)",
    )
    ap.add_argument(
        "--save-every",
        type=int,
        default=25,
        help="Flush cache to disk every N successful writes (default 25)",
    )
    args = ap.parse_args()

    if not PRESCRIBERS.exists():
        print(f"Missing {PRESCRIBERS}", file=sys.stderr)
        return 1

    rate = max(0.5, min(args.rate, 10.0))
    delay = 1.0 / rate
    limit = None if args.all else args.limit
    npis = ranked_npis(limit)
    cache = load_cache()
    contacts: dict = cache.setdefault("contacts", {})

    print(
        f"NPPES enrich: {len(npis)} NPIs "
        f"(limit={'all' if args.all else args.limit}, rate={rate}/s, force={args.force})",
        flush=True,
    )
    print(f"Cache: {OUT} ({len(contacts)} existing)", flush=True)

    fetched = 0
    skipped = 0
    missed = 0
    errors = 0
    since_save = 0
    t0 = time.time()

    for i, npi in enumerate(npis, 1):
        if not args.force and npi in contacts:
            skipped += 1
            continue
        contact = fetch_npi(npi)
        time.sleep(delay)
        if contact is None:
            missed += 1
            # Still mark a stub? Prefer not inventing — leave absent for live API retry.
            if i % 20 == 0 or i == len(npis):
                elapsed = time.time() - t0
                print(
                    f"  progress {i}/{len(npis)} fetched={fetched} skipped={skipped} "
                    f"missed={missed} ({elapsed:.0f}s)",
                    flush=True,
                )
            continue
        contacts[npi] = contact
        fetched += 1
        since_save += 1
        if since_save >= args.save_every:
            save_cache(cache)
            since_save = 0
            print(f"  checkpoint saved ({len(contacts)} contacts) @ {i}/{len(npis)}", flush=True)
        if i % 20 == 0 or i == len(npis):
            elapsed = time.time() - t0
            print(
                f"  progress {i}/{len(npis)} fetched={fetched} skipped={skipped} "
                f"missed={missed} ({elapsed:.0f}s)",
                flush=True,
            )

    save_cache(cache)
    elapsed = time.time() - t0
    print(
        json.dumps(
            {
                "out": str(OUT.relative_to(ROOT)),
                "total_cached": len(contacts),
                "fetched_this_run": fetched,
                "skipped_cached": skipped,
                "missed": missed,
                "errors": errors,
                "elapsed_s": round(elapsed, 1),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
