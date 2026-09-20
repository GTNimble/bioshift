#!/usr/bin/env python3
"""Enrich high-opportunity NPIs with public CMS Open Payments (general / research / ownership).

Writes data/processed/open_payments.json keyed by NPI (resume-safe).
Queries the Open Payments Datastore API for NPIs already in the opportunity set —
does NOT download full national CSVs (multi-GB).

Examples:
  python3 scripts/ingest/enrich_open_payments.py --limit 50
  python3 scripts/ingest/enrich_open_payments.py --limit 200 --program-year 2024
  python3 scripts/ingest/enrich_open_payments.py --all --force

Limitations:
  - Program years lag (CMS typically publishes mid-year for the prior year).
  - Only NPIs present in data/prescribers.json (biosimilar opportunity set).
  - Company rollups are sums of returned rows; not a substitute for CMS profile pages.
  - No secrets; public CMS API.
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
OUT = ROOT / "data" / "processed" / "open_payments.json"

# UUIDs from https://openpaymentsdata.cms.gov metastore
DATASETS: dict[int, dict[str, str]] = {
    2023: {
        "general": "fb3a65aa-c901-4a38-a813-b04b00dfa2a9",
        "research": "ec9521bf-9d97-4603-814c-f4132d34bc4f",
        "ownership": "ac0bc85c-02e3-45d9-89e8-2ff43da85df7",
    },
    2024: {
        "general": "e6b17c6a-2534-4207-a4a1-6746a14911ff",
        "research": "2f15cb85-8887-4dcc-a318-1f8ec1d815b3",
        "ownership": "9ac4f7f8-b6e4-4d80-8410-4aba7e71dd02",
    },
    2025: {
        "general": "fb0b1734-1410-429d-92f6-3f4b35218e5e",
        "research": "f0d1de67-6852-4093-a036-c9328c256a05",
        "ownership": "800aed1b-20ed-4d19-b0c9-dcd10f197ffc",
    },
}

API = "https://openpaymentsdata.cms.gov/api/1/datastore/query/{dataset_id}/0"
UA = "PurpleGap-ingest/1.0 (+Open Payments public enrichment; no secrets)"


def empty_cache() -> dict:
    return {
        "source": "https://openpaymentsdata.cms.gov/",
        "note": (
            "Public CMS Open Payments (Sunshine Act). Program years lag publication. "
            "Cached only for NPIs in the PurpleGap opportunity set — not a national dump. "
            "Totals are gross reported transfers of value."
        ),
        "programYear": None,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "profiles": {},
    }


def load_cache() -> dict:
    if OUT.exists():
        try:
            return json.loads(OUT.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return empty_cache()


def save_cache(cache: dict) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cache["updatedAt"] = datetime.now(timezone.utc).isoformat()
    OUT.write_text(json.dumps(cache), encoding="utf-8")


def ranked_npis(limit: int | None) -> list[str]:
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
    return ordered if limit is None else ordered[:limit]


def api_post(dataset_id: str, body: dict, timeout: float = 60.0) -> dict | None:
    url = API.format(dataset_id=dataset_id)
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "User-Agent": UA,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! API error ({dataset_id[:8]}…): {e}", flush=True)
        return None


def fnum(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def fetch_category(
    dataset_id: str,
    npi: str,
    npi_field: str,
    amount_fields: list[str],
    company_field: str,
    delay: float,
) -> tuple[float, dict[str, float], int]:
    total = 0.0
    by_company: dict[str, float] = defaultdict(float)
    rows_seen = 0
    offset = 0
    page = 100
    while True:
        payload = {
            "conditions": [{"property": npi_field, "value": npi, "operator": "="}],
            "limit": page,
            "offset": offset,
        }
        data = api_post(dataset_id, payload)
        time.sleep(delay)
        if not data:
            break
        results = data.get("results") or data.get("rows") or []
        if not results:
            break
        for row in results:
            amt = 0.0
            for af in amount_fields:
                if af in row and row[af] not in (None, ""):
                    amt = fnum(row[af])
                    break
            company = str(
                row.get(company_field)
                or row.get("submitting_applicable_manufacturer_or_applicable_gpo_name")
                or "Unknown"
            ).strip() or "Unknown"
            total += amt
            by_company[company] += amt
            rows_seen += 1
        if len(results) < page:
            break
        offset += page
        if offset > 2000:
            break
    return total, dict(by_company), rows_seen


def build_profile(npi: str, year: int, datasets: dict[str, str], delay: float) -> dict:
    general_total, general_cos, g_rows = fetch_category(
        datasets["general"],
        npi,
        "covered_recipient_npi",
        ["total_amount_of_payment_usdollars"],
        "applicable_manufacturer_or_applicable_gpo_making_payment_name",
        delay,
    )
    research_total, research_cos, r_rows = fetch_category(
        datasets["research"],
        npi,
        "covered_recipient_npi",
        ["total_amount_of_payment_usdollars"],
        "applicable_manufacturer_or_applicable_gpo_making_payment_name",
        delay,
    )
    ownership_total, ownership_cos, o_rows = fetch_category(
        datasets["ownership"],
        npi,
        "physician_npi",
        [
            "total_amount_invested_usdollars",
            "value_of_interest_usdollars",
            "total_amount_of_payment_usdollars",
        ],
        "applicable_manufacturer_or_applicable_gpo_making_payment_name",
        delay,
    )

    merged: dict[str, float] = defaultdict(float)
    for d in (general_cos, research_cos, ownership_cos):
        for k, v in d.items():
            merged[k] += v
    top = sorted(merged.items(), key=lambda kv: kv[1], reverse=True)[:8]
    grand = general_total + research_total + ownership_total

    return {
        "npi": npi,
        "programYear": year,
        "generalTotalUsd": round(general_total, 2),
        "researchTotalUsd": round(research_total, 2),
        "ownershipTotalUsd": round(ownership_total, 2),
        "totalUsd": round(grand, 2),
        "paymentRowCount": g_rows + r_rows + o_rows,
        "topCompanies": [
            {"name": name, "amountUsd": round(amt, 2)} for name, amt in top if amt > 0
        ],
        "refreshedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Open Payments",
        "lagNote": (
            f"CMS Open Payments program year {year} (public; publication lags the calendar year). "
            "Not a full national file — NPI filtered to PurpleGap opportunity set."
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Enrich NPIs via public CMS Open Payments API")
    ap.add_argument("--limit", type=int, default=50, help="Max NPIs to enrich (default 50)")
    ap.add_argument("--all", action="store_true", help="Enrich every unique NPI in prescribers.json")
    ap.add_argument("--force", action="store_true", help="Re-fetch even if already cached")
    ap.add_argument(
        "--program-year",
        type=int,
        default=2024,
        choices=sorted(DATASETS.keys()),
        help="Open Payments program year (default 2024)",
    )
    ap.add_argument("--rate", type=float, default=4.0, help="Courtesy rate for API paging")
    ap.add_argument("--save-every", type=int, default=10)
    args = ap.parse_args()

    if not PRESCRIBERS.exists():
        print(f"Missing {PRESCRIBERS}", file=sys.stderr)
        return 1

    year = args.program_year
    datasets = DATASETS[year]
    delay = 1.0 / max(0.5, min(args.rate, 8.0))
    limit = None if args.all else args.limit
    npis = ranked_npis(limit)
    cache = load_cache()
    cache["programYear"] = year
    profiles: dict = cache.setdefault("profiles", {})

    print(
        f"Open Payments enrich: {len(npis)} NPIs "
        f"(year={year}, limit={'all' if args.all else args.limit}, force={args.force})",
        flush=True,
    )
    print(f"Cache: {OUT} ({len(profiles)} existing)", flush=True)

    fetched = skipped = empty = 0
    since_save = 0
    t0 = time.time()

    for i, npi in enumerate(npis, 1):
        if not args.force and npi in profiles and profiles[npi].get("programYear") == year:
            skipped += 1
            continue
        profile = build_profile(npi, year, datasets, delay)
        profiles[npi] = profile
        fetched += 1
        if profile["paymentRowCount"] == 0:
            empty += 1
        since_save += 1
        if since_save >= args.save_every:
            save_cache(cache)
            since_save = 0
            print(f"  checkpoint ({len(profiles)} profiles) @ {i}/{len(npis)}", flush=True)
        if i % 10 == 0 or i == len(npis):
            elapsed = time.time() - t0
            print(
                f"  progress {i}/{len(npis)} fetched={fetched} skipped={skipped} "
                f"empty={empty} ({elapsed:.0f}s)",
                flush=True,
            )

    save_cache(cache)
    print(
        json.dumps(
            {
                "out": str(OUT.relative_to(ROOT)),
                "programYear": year,
                "total_cached": len(profiles),
                "fetched_this_run": fetched,
                "skipped_cached": skipped,
                "empty_profiles": empty,
                "elapsed_s": round(time.time() - t0, 1),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
