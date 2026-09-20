#!/usr/bin/env python3
"""Download/filter CMS Part D Prescribers by Provider and Drug (CY2024).

Streams the large national CSV and writes only biosimilar-relevant molecule
rows to data/raw/cms_partd_filtered.jsonl — never loads the full file into memory.

Optional --api mode paginates the CMS data API for known Gnrc_Name values
(and discovers biosimilar suffixes via a lightweight name scan first).
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from targets import (  # noqa: E402
    CMS_API_URL,
    CMS_CSV_URL,
    CMS_YEAR,
    KNOWN_GNRC_NAMES,
    TARGET_STEMS,
    assign_family,
)

RAW_DIR = ROOT / "data" / "raw"
OUT_JSONL = RAW_DIR / "cms_partd_filtered.jsonl"
OUT_META = RAW_DIR / "cms_partd_download_meta.json"
UA = "bioshift-ingest/1.0 (+https://github.com/local/bioshift)"


def open_url(url: str, timeout: int = 600):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=timeout)


def row_to_record(row: dict) -> dict | None:
    gnrc = (row.get("Gnrc_Name") or "").strip()
    family = assign_family(gnrc)
    if not family:
        return None
    try:
        tot_clms = int(float(row.get("Tot_Clms") or 0))
    except ValueError:
        tot_clms = 0
    try:
        tot_cst = float(row.get("Tot_Drug_Cst") or 0)
    except ValueError:
        tot_cst = 0.0
    benes_raw = (row.get("Tot_Benes") or "").strip()
    try:
        tot_benes = int(float(benes_raw)) if benes_raw else 0
    except ValueError:
        tot_benes = 0
    return {
        "Prscrbr_NPI": (row.get("Prscrbr_NPI") or "").strip(),
        "Prscrbr_Last_Org_Name": (row.get("Prscrbr_Last_Org_Name") or "").strip(),
        "Prscrbr_First_Name": (row.get("Prscrbr_First_Name") or "").strip(),
        "Prscrbr_State_Abrvtn": (row.get("Prscrbr_State_Abrvtn") or "").strip(),
        "Prscrbr_Type": (row.get("Prscrbr_Type") or "").strip(),
        "Brnd_Name": (row.get("Brnd_Name") or "").strip(),
        "Gnrc_Name": gnrc,
        "Tot_Clms": tot_clms,
        "Tot_Drug_Cst": tot_cst,
        "Tot_Benes": tot_benes,
        "familyId": family,
        "GE65_Sprsn_Flag": (row.get("GE65_Sprsn_Flag") or "").strip(),
        "GE65_Bene_Sprsn_Flag": (row.get("GE65_Bene_Sprsn_Flag") or "").strip(),
    }


def stream_csv(url: str, out_path: Path) -> dict:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    scanned = 0
    kept = 0
    by_family: dict[str, int] = {}
    gnrc_seen: dict[str, int] = {}
    print(f"Streaming CSV from {url}", flush=True)
    with open_url(url) as resp, out_path.open("w", encoding="utf-8") as out:
        cl = resp.headers.get("Content-Length")
        print(f"Content-Length: {cl}", flush=True)
        text = io.TextIOWrapper(resp, encoding="utf-8", errors="replace", newline="")
        reader = csv.DictReader(text)
        for row in reader:
            scanned += 1
            if scanned % 1_000_000 == 0:
                elapsed = time.time() - t0
                print(
                    f"  scanned={scanned:,} kept={kept:,} "
                    f"rate={scanned/max(elapsed,0.1):,.0f} rows/s",
                    flush=True,
                )
            rec = row_to_record(row)
            if not rec:
                continue
            kept += 1
            by_family[rec["familyId"]] = by_family.get(rec["familyId"], 0) + 1
            gnrc_seen[rec["Gnrc_Name"]] = gnrc_seen.get(rec["Gnrc_Name"], 0) + 1
            out.write(json.dumps(rec, separators=(",", ":")) + "\n")
    meta = {
        "mode": "csv_stream",
        "source_url": url,
        "cms_year": CMS_YEAR,
        "scanned_rows": scanned,
        "kept_rows": kept,
        "by_family": dict(sorted(by_family.items())),
        "gnrc_names": dict(sorted(gnrc_seen.items(), key=lambda x: -x[1])),
        "elapsed_sec": round(time.time() - t0, 1),
        "output": str(out_path.relative_to(ROOT)),
    }
    OUT_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))
    return meta


def api_fetch_gnrc(gnrc: str, page_size: int = 5000) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        q = urllib.parse.urlencode(
            {
                "filter[Gnrc_Name]": gnrc,
                "size": str(page_size),
                "offset": str(offset),
            }
        )
        url = f"{CMS_API_URL}?{q}"
        with open_url(url, timeout=120) as resp:
            batch = json.load(resp)
        if not batch:
            break
        for row in batch:
            rec = row_to_record(row)
            if rec:
                rows.append(rec)
        if len(batch) < page_size:
            break
        offset += page_size
        print(f"    {gnrc}: offset={offset} got={len(rows)}", flush=True)
    return rows


def discover_gnrc_via_scan(url: str, max_scan: int | None = None) -> set[str]:
    """One-pass name discovery (optional pre-step for API mode)."""
    found: set[str] = set(KNOWN_GNRC_NAMES)
    stems = [s for s, _ in TARGET_STEMS]
    scanned = 0
    print("Discovering Gnrc_Name values via CSV scan…", flush=True)
    with open_url(url) as resp:
        text = io.TextIOWrapper(resp, encoding="utf-8", errors="replace", newline="")
        reader = csv.DictReader(text)
        for row in reader:
            scanned += 1
            g = (row.get("Gnrc_Name") or "").strip()
            gl = g.lower()
            if any(s in gl for s in stems) and assign_family(g):
                found.add(g)
            if max_scan and scanned >= max_scan:
                break
            if scanned % 2_000_000 == 0:
                print(f"  discover scanned={scanned:,} unique={len(found)}", flush=True)
    print(f"Discovered {len(found)} Gnrc_Name values after {scanned:,} rows", flush=True)
    return found


def api_mode(out_path: Path, discover: bool, names_file: str = "") -> dict:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    names = set(KNOWN_GNRC_NAMES)
    if names_file:
        data = json.loads(Path(names_file).read_text())
        names |= set(data.get("hits") or data.get("names") or [])
    if discover:
        names |= discover_gnrc_via_scan(CMS_CSV_URL)
    all_rows: list[dict] = []
    by_family: dict[str, int] = {}
    gnrc_seen: dict[str, int] = {}
    for name in sorted(names):
        print(f"API fetch: {name}", flush=True)
        batch = api_fetch_gnrc(name)
        print(f"  -> {len(batch)} rows", flush=True)
        for rec in batch:
            all_rows.append(rec)
            by_family[rec["familyId"]] = by_family.get(rec["familyId"], 0) + 1
            gnrc_seen[rec["Gnrc_Name"]] = gnrc_seen.get(rec["Gnrc_Name"], 0) + 1
    with out_path.open("w", encoding="utf-8") as out:
        for rec in all_rows:
            out.write(json.dumps(rec, separators=(",", ":")) + "\n")
    meta = {
        "mode": "api",
        "source_url": CMS_API_URL,
        "cms_csv_url": CMS_CSV_URL,
        "cms_year": CMS_YEAR,
        "gnrc_queried": sorted(names),
        "kept_rows": len(all_rows),
        "by_family": dict(sorted(by_family.items())),
        "gnrc_names": dict(sorted(gnrc_seen.items(), key=lambda x: -x[1])),
        "elapsed_sec": round(time.time() - t0, 1),
        "output": str(out_path.relative_to(ROOT)),
    }
    OUT_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))
    return meta


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--mode",
        choices=["csv", "api"],
        default="csv",
        help="csv=stream national PUF; api=paginate CMS API by Gnrc_Name",
    )
    p.add_argument(
        "--discover-names",
        action="store_true",
        help="(api mode) scan CSV first to discover biosimilar Gnrc_Name suffixes",
    )
    p.add_argument("--url", default=CMS_CSV_URL, help="Override CMS CSV URL")
    p.add_argument(
        "--names-file",
        default="",
        help="JSON with {hits:[Gnrc_Name,...]} for api mode (skip discovery)",
    )
    args = p.parse_args()
    if args.mode == "csv":
        stream_csv(args.url, OUT_JSONL)
    else:
        api_mode(OUT_JSONL, discover=args.discover_names, names_file=args.names_file)


if __name__ == "__main__":
    main()
