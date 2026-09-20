#!/usr/bin/env python3
"""CMS Medicare Part D Spending by Drug → PurpleGap family market-context KPIs.

Writes data/processed/partd_drug_spend.json (+ data/partd_drug_spend.json sync).

  npm run data:partd-spend
  python3 scripts/ingest/download_partd_spend.py [--offline-sample]

Honesty: gross Part D (not net of rebates/DIR); lagged annual national totals;
filtered to PurpleGap stems — not a full national dump.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from targets import KNOWN_GNRC_NAMES, TARGET_STEMS, assign_family  # noqa: E402

OUT = ROOT / "data" / "processed" / "partd_drug_spend.json"
OUT_SYNC = ROOT / "data" / "partd_drug_spend.json"
DATASET_ID = "7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b"
API = f"https://data.cms.gov/data-api/v1/dataset/{DATASET_ID}/data"
UA = "PurpleGap-ingest/1.0 (+Part D Spending by Drug; public; no secrets)"
YEAR = 2024


def fnum(v) -> float:
    try:
        return float(str(v).replace(",", "") or 0)
    except (TypeError, ValueError):
        return 0.0


def inum(v) -> int:
    try:
        return int(float(str(v).replace(",", "") or 0))
    except (TypeError, ValueError):
        return 0


def api_get(params: dict, timeout: float = 90.0) -> list[dict]:
    qs = urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(
        f"{API}?{qs}", headers={"User-Agent": UA, "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data if isinstance(data, list) else []
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! API error: {e}", flush=True)
        return []


def gnrc_candidates() -> list[str]:
    names = list(KNOWN_GNRC_NAMES)
    for stem, _fid in TARGET_STEMS:
        title = " ".join(w.capitalize() for w in stem.replace("_", " ").split())
        if title not in names:
            names.append(title)
    seen: set[str] = set()
    out: list[str] = []
    for n in names:
        key = n.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(n.strip())
    return out


def fetch_gnrc(gnrc: str, delay: float) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 500
    while True:
        batch = api_get({"size": page, "offset": offset, "filter[Gnrc_Name]": gnrc})
        time.sleep(delay)
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
        if offset > 5000:
            break
    return rows


def build_payload(families: list[dict], year: int, offline: bool = False) -> dict:
    families = sorted(families, key=lambda f: f["totalSpendUsd"], reverse=True)
    return {
        "source": "https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicare-part-d-spending-by-drug",
        "datasetId": DATASET_ID,
        "year": year,
        "offlineSample": offline,
        "note": (
            "CMS Medicare Part D Spending by Drug — gross Part D (not net of rebates/DIR). "
            "Filtered to PurpleGap molecule families (Overall manufacturer rows when available). "
            "National drug totals for market context — not NPI-level opportunity."
        ),
        "honesty": "Gross Part D national spend; not net of rebates/DIR. Lagged annual release.",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "familyCount": len(families),
        "families": {f["familyId"]: f for f in families},
        "familyList": families,
    }


def offline_payload(year: int) -> dict:
    sample = {
        "adalimumab": ("Humira", 9.17e8, 120_000, 45_000),
        "ustekinumab": ("Stelara", 4.2e8, 35_000, 18_000),
        "pegfilgrastim": ("Neulasta", 1.1e8, 22_000, 15_000),
        "infliximab": ("Remicade", 2.5e8, 40_000, 12_000),
    }
    families = []
    for fid, (brand, spend, claims, benes) in sample.items():
        families.append(
            {
                "familyId": fid,
                "ingredient": fid.replace("_", " "),
                "referenceBrandHint": brand,
                "totalSpendUsd": spend,
                "totalClaims": claims,
                "totalBenes": benes,
                "priorYearSpendUsd": round(spend * 0.92, 2),
                "yoySpendChange": 0.087,
                "brandCount": 1,
                "brands": [
                    {
                        "brandName": brand,
                        "genericName": fid,
                        "spendUsd": spend,
                        "claims": claims,
                        "benes": benes,
                        "manufacturer": "Overall",
                        "priorYearSpendUsd": round(spend * 0.92, 2),
                        "yoySpendChange": 0.087,
                    }
                ],
            }
        )
    return build_payload(families, year, offline=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=YEAR)
    ap.add_argument("--rate", type=float, default=4.0)
    ap.add_argument("--offline-sample", action="store_true")
    args = ap.parse_args()
    year = args.year
    delay = 1.0 / max(0.5, min(args.rate, 8.0))
    OUT.parent.mkdir(parents=True, exist_ok=True)

    if args.offline_sample:
        payload = offline_payload(year)
    else:
        names = gnrc_candidates()
        print(f"Part D spend: {len(names)} Gnrc_Name queries (year={year})", flush=True)
        by_family: dict[str, dict[str, dict]] = {}
        fallback: dict[str, dict[str, dict]] = {}
        for i, gnrc in enumerate(names, 1):
            for row in fetch_gnrc(gnrc, delay):
                g = (row.get("Gnrc_Name") or gnrc or "").strip()
                family = assign_family(g)
                if not family:
                    continue
                spend = fnum(row.get(f"Tot_Spndng_{year}"))
                claims = inum(row.get(f"Tot_Clms_{year}"))
                benes = inum(row.get(f"Tot_Benes_{year}"))
                prior = fnum(row.get(f"Tot_Spndng_{year - 1}"))
                if spend <= 0 and claims <= 0:
                    continue
                brand = (row.get("Brnd_Name") or "").strip() or g
                mftr = (row.get("Mftr_Name") or "").strip()
                rec = {
                    "brandName": brand,
                    "genericName": g,
                    "spendUsd": round(spend, 2),
                    "claims": claims,
                    "benes": benes,
                    "manufacturer": mftr,
                    "priorYearSpendUsd": round(prior, 2) if prior else None,
                    "yoySpendChange": round((spend - prior) / prior, 4) if prior > 0 else None,
                }
                key = brand.lower()
                bucket = by_family if mftr.lower() == "overall" else fallback
                fam_map = bucket.setdefault(family, {})
                prev = fam_map.get(key)
                if not prev or rec["spendUsd"] > prev["spendUsd"]:
                    fam_map[key] = rec
            if i % 5 == 0 or i == len(names):
                print(f"  {i}/{len(names)}", flush=True)

        families: list[dict] = []
        for fid in set(by_family) | set(fallback):
            brands_map = by_family.get(fid) or fallback.get(fid) or {}
            brands = sorted(brands_map.values(), key=lambda b: b["spendUsd"], reverse=True)[:20]
            total = sum(b["spendUsd"] for b in brands)
            prior_sum = sum(b.get("priorYearSpendUsd") or 0 for b in brands)
            families.append(
                {
                    "familyId": fid,
                    "ingredient": fid.replace("_", " "),
                    "referenceBrandHint": brands[0]["brandName"] if brands else fid,
                    "totalSpendUsd": round(total, 2),
                    "totalClaims": sum(b["claims"] for b in brands),
                    "totalBenes": sum(b["benes"] for b in brands),
                    "priorYearSpendUsd": round(prior_sum, 2) if prior_sum else None,
                    "yoySpendChange": round((total - prior_sum) / prior_sum, 4) if prior_sum > 0 else None,
                    "brandCount": len(brands),
                    "brands": brands,
                }
            )
        payload = build_payload(families, year)

    text = json.dumps(payload, indent=2)
    OUT.write_text(text, encoding="utf-8")
    OUT_SYNC.write_text(text, encoding="utf-8")
    print(json.dumps({"out": str(OUT.relative_to(ROOT)), "families": payload["familyCount"], "year": year}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
