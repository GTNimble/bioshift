#!/usr/bin/env python3
"""Map opportunity NPIs → group/org via CMS Public Provider Enrollment (PECOS-adjacent).

Uses PECOS_ASCT_CNTL_ID as an enrollment association key (illustrative group rollup).
Falls back to NPPES organization displayName from nppes_contacts.json when present.

Writes data/processed/enrollment_groups.json (+ data/ sync).

  npm run data:enrollment
  python3 scripts/ingest/enrich_enrollment_groups.py --limit 150

Honesty: PPE is not a full PECOS reassignment dump; association IDs ≠ legal entity;
illustrative Opportunity $ uses a simplified share-gap proxy (UI prefers live peer-gap).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRESCRIBERS = ROOT / "data" / "prescribers.json"
NPPES = ROOT / "data" / "processed" / "nppes_contacts.json"
OUT = ROOT / "data" / "processed" / "enrollment_groups.json"
OUT_SYNC = ROOT / "data" / "enrollment_groups.json"

DATASET_ID = "2457ea29-fc82-48b0-86ec-3b0755de7515"
API = f"https://data.cms.gov/data-api/v1/dataset/{DATASET_ID}/data"
UA = "PurpleGap-ingest/1.0 (+Public Provider Enrollment; public; no secrets)"


def fnum(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def api_get(params: dict, timeout: float = 60.0) -> list[dict]:
    qs = urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(f"{API}?{qs}", headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data if isinstance(data, list) else []
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! API error: {e}", flush=True)
        return []


def ranked_npis(limit: int | None) -> list[tuple[str, float, str, str, str]]:
    data = json.loads(PRESCRIBERS.read_text(encoding="utf-8"))
    rows = data.get("rows") or []
    brand: dict[str, float] = defaultdict(float)
    meta: dict[str, tuple[str, str, str]] = {}
    for r in rows:
        npi = str(r.get("npi") or "").strip()
        if not npi:
            continue
        name = f"{r.get('providerLastName') or ''}, {r.get('providerFirstName') or ''}".strip(", ")
        meta.setdefault(npi, (name, str(r.get("state") or ""), str(r.get("specialty") or "")))
        if r.get("isBrand"):
            brand[npi] += fnum(r.get("Tot_Drug_Cst"))
        else:
            brand.setdefault(npi, brand.get(npi, 0.0))
    ordered = sorted(brand.keys(), key=lambda n: brand[n], reverse=True)
    if limit is not None:
        ordered = ordered[:limit]
    return [(n, brand[n], meta[n][0], meta[n][1], meta[n][2]) for n in ordered]


def load_nppes() -> dict:
    if NPPES.exists():
        try:
            return json.loads(NPPES.read_text(encoding="utf-8")).get("contacts") or {}
        except json.JSONDecodeError:
            pass
    return {}


def opportunity_by_npi() -> dict[str, dict]:
    data = json.loads(PRESCRIBERS.read_text(encoding="utf-8"))
    rows = data.get("rows") or []
    out: dict[str, dict] = {}
    for r in rows:
        npi = str(r.get("npi") or "").strip()
        if not npi:
            continue
        cur = out.setdefault(
            npi,
            {"brandCost": 0.0, "bioCost": 0.0, "brandClaims": 0, "bioClaims": 0, "families": set()},
        )
        cst = fnum(r.get("Tot_Drug_Cst"))
        clm = int(fnum(r.get("Tot_Clms")))
        if r.get("isBrand"):
            cur["brandCost"] += cst
            cur["brandClaims"] += clm
        elif r.get("isBiosimilar"):
            cur["bioCost"] += cst
            cur["bioClaims"] += clm
        fam = r.get("familyId")
        if fam:
            cur["families"].add(fam)
    for npi, cur in out.items():
        total = cur["brandClaims"] + cur["bioClaims"]
        cur["biosimilarShare"] = (cur["bioClaims"] / total) if total else 0.0
        cur["families"] = sorted(cur["families"])
        gap = max(0.0, 0.15 - cur["biosimilarShare"])
        cur["illustrativeOpportunityUsd"] = round(cur["brandCost"] * gap, 2)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=150)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--rate", type=float, default=5.0)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--offline-sample", action="store_true")
    args = ap.parse_args()

    if not PRESCRIBERS.exists():
        print(f"Missing {PRESCRIBERS}", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    delay = 1.0 / max(0.5, min(args.rate, 8.0))
    limit = None if args.all else args.limit
    ranked = ranked_npis(limit)
    opps = opportunity_by_npi()
    nppes = load_nppes()

    if OUT.exists() and not args.force and not args.offline_sample:
        try:
            prior = json.loads(OUT.read_text(encoding="utf-8"))
            npi_map = prior.get("npiEnrollment") or {}
        except json.JSONDecodeError:
            npi_map = {}
    else:
        npi_map = {}

    print(f"Enrollment enrich: {len(ranked)} NPIs", flush=True)

    if args.offline_sample:
        for i, (npi, _bc, name, state, spec) in enumerate(ranked[:40]):
            npi_map[npi] = {
                "npi": npi,
                "pecosAssocControlId": f"DEMO-ASSOC-{i // 5}",
                "enrollmentId": f"DEMO-ENR-{npi[-4:]}",
                "providerType": spec or "PRACTITIONER",
                "state": state,
                "orgName": f"Demo Group {(i // 5) + 1}",
                "firstName": "",
                "lastName": name.split(",")[0] if name else "",
                "multipleNpiFlag": "N",
                "source": "offline-sample",
            }
    else:
        for i, (npi, _bc, name, state, spec) in enumerate(ranked, 1):
            if not args.force and npi in npi_map and npi_map[npi].get("pecosAssocControlId") is not None:
                continue
            rows = api_get({"size": 10, "filter[NPI]": npi})
            time.sleep(delay)
            if not rows:
                npi_map[npi] = {
                    "npi": npi,
                    "pecosAssocControlId": None,
                    "enrollmentId": None,
                    "providerType": None,
                    "state": state,
                    "orgName": None,
                    "firstName": None,
                    "lastName": None,
                    "multipleNpiFlag": None,
                    "source": "ppe-miss",
                }
            else:
                row = rows[0]
                npi_map[npi] = {
                    "npi": npi,
                    "pecosAssocControlId": (row.get("PECOS_ASCT_CNTL_ID") or "").strip() or None,
                    "enrollmentId": (row.get("ENRLMT_ID") or "").strip() or None,
                    "providerType": (row.get("PROVIDER_TYPE_DESC") or row.get("PROVIDER_TYPE_CD") or "").strip() or None,
                    "state": (row.get("STATE_CD") or state or "").strip() or None,
                    "orgName": (row.get("ORG_NAME") or "").strip() or None,
                    "firstName": (row.get("FIRST_NAME") or "").strip() or None,
                    "lastName": (row.get("LAST_NAME") or "").strip() or None,
                    "multipleNpiFlag": (row.get("MULTIPLE_NPI_FLAG") or "").strip() or None,
                    "source": "ppe",
                }
            if i % 25 == 0:
                print(f"  progress {i}/{len(ranked)}", flush=True)
                OUT.write_text(json.dumps({"npiEnrollment": npi_map}), encoding="utf-8")

    groups: dict[str, dict] = {}
    npi_to_group: dict[str, str] = {}

    for npi, _bc, name, state, spec in ranked:
        enr = npi_map.get(npi) or {}
        contact = nppes.get(npi) or {}
        assoc = enr.get("pecosAssocControlId")
        org = enr.get("orgName") or (
            contact.get("displayName") if contact.get("enumerationType") == "NPI-2" else None
        )
        if assoc:
            gid = f"pecos:{assoc}"
            gname = org or f"PECOS association {assoc}"
            gsource = "pecos_asct_cntl_id"
        elif org:
            gid = f"org:{str(org).strip().lower()}"
            gname = org
            gsource = "nppes_or_ppe_org_name"
        else:
            gid = f"solo:{npi}"
            gname = name or npi
            gsource = "singleton"

        npi_to_group[npi] = gid
        opp = opps.get(npi) or {}
        g = groups.get(gid)
        if not g:
            groups[gid] = {
                "groupId": gid,
                "displayName": gname,
                "source": gsource,
                "pecosAssocControlId": assoc,
                "state": enr.get("state") or state,
                "npiCount": 0,
                "npis": [],
                "totalBrandCostUsd": 0.0,
                "illustrativeOpportunityUsd": 0.0,
                "families": set(),
            }
            g = groups[gid]
        g["npiCount"] += 1
        g["npis"].append(
            {
                "npi": npi,
                "providerName": name,
                "state": state,
                "specialty": spec,
                "brandCostUsd": round(opp.get("brandCost") or 0, 2),
                "illustrativeOpportunityUsd": opp.get("illustrativeOpportunityUsd") or 0,
                "biosimilarShare": round(opp.get("biosimilarShare") or 0, 4),
            }
        )
        g["totalBrandCostUsd"] = round(g["totalBrandCostUsd"] + (opp.get("brandCost") or 0), 2)
        g["illustrativeOpportunityUsd"] = round(
            g["illustrativeOpportunityUsd"] + (opp.get("illustrativeOpportunityUsd") or 0), 2
        )
        for f in opp.get("families") or []:
            g["families"].add(f)

    group_list = []
    for g in groups.values():
        g["families"] = sorted(g["families"])
        g["npis"] = sorted(g["npis"], key=lambda x: x["illustrativeOpportunityUsd"], reverse=True)
        group_list.append(g)
    group_list.sort(key=lambda g: g["illustrativeOpportunityUsd"], reverse=True)

    payload = {
        "source": "https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/medicare-fee-for-service-public-provider-enrollment",
        "datasetId": DATASET_ID,
        "note": (
            "Public Provider Enrollment (PECOS-adjacent) association control IDs + optional NPPES org names. "
            "Not a complete PECOS reassignment / TIN hierarchy. Group Opportunity $ is illustrative gross Part D."
        ),
        "honesty": (
            "Enrollment association ≠ guaranteed legal practice entity. "
            "Illustrative opportunity in this file uses a simplified share-gap proxy; "
            "UI prefers live peer-gap Opportunity $ when joining."
        ),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "npiEnrollment": npi_map,
        "npiToGroupId": npi_to_group,
        "groups": {g["groupId"]: g for g in group_list},
        "groupList": group_list,
        "groupCount": len(group_list),
        "npiCount": len(npi_map),
    }
    text = json.dumps(payload)
    OUT.write_text(text, encoding="utf-8")
    OUT_SYNC.write_text(text, encoding="utf-8")
    print(
        json.dumps(
            {
                "out": str(OUT.relative_to(ROOT)),
                "groups": len(group_list),
                "npis": len(npi_map),
                "multiNpiGroups": sum(1 for g in group_list if g["npiCount"] > 1),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
