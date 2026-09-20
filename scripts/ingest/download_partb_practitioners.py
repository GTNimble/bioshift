#!/usr/bin/env python3
"""Medicare Physician & Other Practitioners (by Provider and Service) — biologic HCPCS.

Writes data/processed/partb_practitioners.json (+ data/ sync).

  npm run data:partb
  python3 scripts/ingest/download_partb_practitioners.py [--top 40] [--offline-sample]

Honesty: FFS Part B only; HCPCS≠NDC; lagged annual; capped top-NPI extract.
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "processed" / "partb_practitioners.json"
OUT_SYNC = ROOT / "data" / "partb_practitioners.json"
DATASET_ID = "0e9f2f2b-7bf9-451a-912c-e02e654dd725"
API = f"https://data.cms.gov/data-api/v1/dataset/{DATASET_ID}/data"
UA = "PurpleGap-ingest/1.0 (+Part B Practitioner PUF; public; no secrets)"
YEAR = 2023

HCPCS_FAMILY: dict[str, str] = {
    "J1745": "infliximab", "Q5103": "infliximab", "Q5104": "infliximab", "Q5121": "infliximab",
    "J9312": "rituximab", "Q5115": "rituximab", "Q5119": "rituximab", "Q5123": "rituximab",
    "J9355": "trastuzumab", "Q5116": "trastuzumab", "Q5117": "trastuzumab",
    "J9035": "bevacizumab", "Q5107": "bevacizumab", "Q5118": "bevacizumab",
    "J2506": "pegfilgrastim", "Q5108": "pegfilgrastim", "Q5122": "pegfilgrastim",
    "J1442": "filgrastim",
    "J0897": "denosumab",
    "J2778": "ranibizumab",
    "J0881": "darbepoetin",
    "J0885": "epoetin", "Q5106": "epoetin",
}


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


def api_get(params: dict, timeout: float = 120.0) -> list[dict]:
    qs = urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(f"{API}?{qs}", headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data if isinstance(data, list) else []
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! API error: {e}", flush=True)
        return []


def fetch_hcpcs(code: str, top: int, delay: float) -> list[dict]:
    heap: list[dict] = []
    offset = 0
    page = 1000
    scanned = 0
    while True:
        batch = api_get({"size": page, "offset": offset, "filter[HCPCS_Cd]": code})
        time.sleep(delay)
        if not batch:
            break
        scanned += len(batch)
        for row in batch:
            npi = str(row.get("Rndrng_NPI") or "").strip()
            if not npi:
                continue
            if row.get("Tot_Mdcr_Pymt_Amt") not in (None, ""):
                pay = fnum(row.get("Tot_Mdcr_Pymt_Amt"))
            else:
                pay = fnum(row.get("Avg_Mdcr_Pymt_Amt")) * fnum(row.get("Tot_Srvcs"))
            if pay <= 0:
                continue
            last = (row.get("Rndrng_Prvdr_Last_Org_Name") or "").strip()
            first = (row.get("Rndrng_Prvdr_First_Name") or "").strip()
            heap.append(
                {
                    "npi": npi,
                    "providerName": f"{last}, {first}".strip(", ") or last or npi,
                    "state": (row.get("Rndrng_Prvdr_State_Abrvtn") or "").strip(),
                    "specialty": (row.get("Rndrng_Prvdr_Type") or "").strip(),
                    "hcpcs": code,
                    "hcpcsDesc": ((row.get("HCPCS_Desc") or "").strip())[:160],
                    "familyId": HCPCS_FAMILY.get(code, "unknown"),
                    "services": fnum(row.get("Tot_Srvcs")),
                    "benes": inum(row.get("Tot_Benes")),
                    "medicarePaymentUsd": round(pay, 2),
                    "avgPaymentUsd": round(fnum(row.get("Avg_Mdcr_Pymt_Amt")), 4),
                }
            )
        if len(batch) < page:
            break
        offset += page
        if offset > 20000:
            break
    heap.sort(key=lambda r: r["medicarePaymentUsd"], reverse=True)
    print(f"  {code}: scanned≈{scanned} kept={min(top, len(heap))}", flush=True)
    return heap[:top]


def offline_sample(top: int) -> list[dict]:
    demos = [
        ("J1745", "infliximab", "Injection, infliximab", "CA", "Rheumatology"),
        ("J9312", "rituximab", "Injection, rituximab", "NY", "Hematology-Oncology"),
        ("J9035", "bevacizumab", "Injection, bevacizumab", "TX", "Medical Oncology"),
        ("J2506", "pegfilgrastim", "Injection, pegfilgrastim", "FL", "Hematology-Oncology"),
        ("J0897", "denosumab", "Injection, denosumab", "IL", "Endocrinology"),
    ]
    rows = []
    for i, (code, fam, desc, st, spec) in enumerate(demos):
        for j in range(min(top, 5)):
            rows.append(
                {
                    "npi": f"{1000000000 + i * 100 + j}",
                    "providerName": f"Sample{i}_{j}, Provider",
                    "state": st,
                    "specialty": spec,
                    "hcpcs": code,
                    "hcpcsDesc": desc,
                    "familyId": fam,
                    "services": float(1000 - j * 50),
                    "benes": 40 - j,
                    "medicarePaymentUsd": round(250000 - j * 15000 - i * 1000, 2),
                    "avgPaymentUsd": 50.0,
                }
            )
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=40)
    ap.add_argument("--rate", type=float, default=3.0)
    ap.add_argument("--offline-sample", action="store_true")
    ap.add_argument("--codes", type=str, default="")
    args = ap.parse_args()
    delay = 1.0 / max(0.5, min(args.rate, 6.0))
    OUT.parent.mkdir(parents=True, exist_ok=True)

    codes = list(HCPCS_FAMILY.keys())
    if args.codes:
        codes = [c.strip().upper() for c in args.codes.split(",") if c.strip()]

    if args.offline_sample:
        rows = offline_sample(args.top)
        offline = True
    else:
        offline = False
        rows = []
        print(f"Part B: {len(codes)} HCPCS, top={args.top}/code", flush=True)
        for code in codes:
            rows.extend(fetch_hcpcs(code, args.top, delay))

    by_npi: dict[str, dict] = {}
    for r in rows:
        n = by_npi.get(r["npi"])
        if not n:
            by_npi[r["npi"]] = {
                "npi": r["npi"],
                "providerName": r["providerName"],
                "state": r["state"],
                "specialty": r["specialty"],
                "totalMedicarePaymentUsd": r["medicarePaymentUsd"],
                "totalServices": r["services"],
                "families": [r["familyId"]],
                "hcpcsCodes": [r["hcpcs"]],
                "lineCount": 1,
            }
        else:
            n["totalMedicarePaymentUsd"] = round(n["totalMedicarePaymentUsd"] + r["medicarePaymentUsd"], 2)
            n["totalServices"] += r["services"]
            if r["familyId"] not in n["families"]:
                n["families"].append(r["familyId"])
            if r["hcpcs"] not in n["hcpcsCodes"]:
                n["hcpcsCodes"].append(r["hcpcs"])
            n["lineCount"] += 1

    top_npis = sorted(by_npi.values(), key=lambda x: x["totalMedicarePaymentUsd"], reverse=True)[:200]
    payload = {
        "source": "https://data.cms.gov/provider-summary-by-type-of-service/medicare-physician-other-practitioners/medicare-physician-other-practitioners-by-provider-and-service",
        "datasetId": DATASET_ID,
        "year": YEAR,
        "offlineSample": offline,
        "note": (
            "FFS Part B Physician & Other Practitioners by Provider and Service. "
            "HCPCS≠NDC; buy-and-bill / infused biologic context. "
            f"Capped to top {args.top} NPIs per in-scope HCPCS — not a full national dump."
        ),
        "honesty": (
            "Medicare FFS Part B only (not Medicare Advantage). Annual PUF is lagged. "
            "HCPCS units ≠ Part D claims; payments are Medicare payment amounts, not ASP invoice cost."
        ),
        "hcpcsInScope": HCPCS_FAMILY,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "rowCount": len(rows),
        "npiCount": len(by_npi),
        "rows": rows,
        "topNpis": top_npis,
    }
    text = json.dumps(payload)
    OUT.write_text(text, encoding="utf-8")
    OUT_SYNC.write_text(text, encoding="utf-8")
    print(json.dumps({"out": str(OUT.relative_to(ROOT)), "rows": len(rows), "npis": len(by_npi)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
