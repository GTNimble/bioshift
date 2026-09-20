#!/usr/bin/env python3
"""Download latest FDA Purple Book monthly CSV and emit a compact family map."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from targets import (  # noqa: E402
    PURPLE_BOOK_CSV_DEFAULT,
    PURPLE_BOOK_PAGE,
    TARGET_STEMS,
    THERAPEUTIC_AREA,
    assign_family,
)

RAW_DIR = ROOT / "data" / "raw"
UA = "bioshift-ingest/1.0"


def latest_csv_url() -> str:
    req = urllib.request.Request(PURPLE_BOOK_PAGE, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    # Prefer 2026 links, then 2025; take last (most recent month) in page order
    links = re.findall(
        r'https://www\.accessdata\.fda\.gov/drugsatfda_docs/PurpleBook/\d{4}/'
        r'purplebook-search-[A-Za-z]+-data-download\.csv',
        html,
    )
    if not links:
        return PURPLE_BOOK_CSV_DEFAULT
    # Page lists months chronologically; last 2026 link is latest
    y2026 = [u for u in links if "/2026/" in u]
    return (y2026 or links)[-1]


def parse_purple_book(path: Path) -> list[dict]:
    """Parse full-database section of the monthly CSV (second header block)."""
    with path.open(encoding="utf-8", errors="replace", newline="") as f:
        rows = list(csv.reader(f))
    header_idxs = [
        i
        for i, r in enumerate(rows)
        if r and r[0] in ("N/R/U", "Applicant") and "Proper Name" in r
    ]
    if not header_idxs:
        raise RuntimeError("Could not find Purple Book header row")
    # Use the last header — full database section
    hi = header_idxs[-1]
    header = rows[hi]
    # Normalize empty first col label
    if header[0] == "N/R/U":
        field_offset = 0
    else:
        field_offset = 0
    products: list[dict] = []
    for r in rows[hi + 1 :]:
        if not r or all(not c.strip() for c in r):
            continue
        # Skip if looks like another title
        if r[0].startswith("Purple Book") or "Newly Approved" in r[0]:
            continue
        # Pad
        while len(r) < len(header):
            r.append("")
        d = dict(zip(header, r))
        # When N/R/U column present, full-list rows often have empty N/R/U
        applicant = (d.get("Applicant") or "").strip()
        proper = (d.get("Proper Name") or "").strip()
        prop = (d.get("Proprietary Name") or "").strip()
        if not proper and not prop:
            continue
        if not applicant:
            continue
        license_type = (d.get("License Type") or "").strip()
        products.append(
            {
                "applicant": applicant,
                "blaNumber": (d.get("BLA Number") or "").strip(),
                "proprietaryName": prop,
                "properName": proper,
                "licenseType": license_type,
                "approvalDate": (d.get("Approval Date") or "").strip(),
                "interApprovalDate": (d.get("Inter. Approval Date") or "").strip(),
                "refProperName": (d.get("Ref. Product Proper Name") or "").strip(),
                "refProprietaryName": (d.get("Ref. Product Proprietary Name") or "").strip(),
                "marketingStatus": (d.get("Marketing Status") or "").strip(),
                "center": (d.get("Center") or "").strip(),
            }
        )
    return products


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:60] or "product"


def approval_year(date_str: str) -> int:
    # e.g. 23-Jul-86 or 31-Dec-2020
    m = re.search(r"(\d{2,4})$", (date_str or "").strip())
    if not m:
        return 0
    y = int(m.group(1))
    if y < 100:
        y += 1900 if y >= 70 else 2000
    return y


def family_from_proper(proper: str, ref_proper: str) -> str | None:
    # Prefer reference proper name for biosimilars
    for candidate in (ref_proper, proper):
        fid = assign_family(candidate)
        if fid:
            return fid
    # Strip 4-letter suffix e.g. adalimumab-atto
    base = re.sub(r"-[a-z]{4}$", "", (proper or "").lower())
    return assign_family(base)


def build_families(products: list[dict]) -> list[dict]:
    by_fam: dict[str, list[dict]] = defaultdict(list)
    for p in products:
        fid = family_from_proper(p["properName"], p["refProperName"])
        if not fid:
            continue
        by_fam[fid].append(p)

    families = []
    for fid, plist in sorted(by_fam.items()):
        # Deduplicate by proprietary name + bla
        seen = set()
        uniq = []
        for p in plist:
            key = (p["proprietaryName"].lower(), p["blaNumber"])
            if key in seen:
                continue
            seen.add(key)
            uniq.append(p)

        refs = [p for p in uniq if "351(a)" in p["licenseType"]]
        bios = [
            p
            for p in uniq
            if "351(k)" in p["licenseType"] or "Biosimilar" in p["licenseType"]
            or "Interchangeable" in p["licenseType"]
        ]
        # Reference brand: prefer 351(a) with matching proper name stem
        ref = None
        if refs:
            # Prefer ones without hyphenated suffix in proper name
            refs_sorted = sorted(
                refs,
                key=lambda p: (
                    0 if "-" not in p["properName"].lower().split()[-1:][0] else 1,
                    approval_year(p["approvalDate"]) or 9999,
                ),
            )
            ref = refs_sorted[0]
        elif bios:
            # Fall back to first biosimilar's stated reference
            ref_name = bios[0].get("refProprietaryName") or ""
            ref = {
                "proprietaryName": ref_name or fid,
                "applicant": "",
                "properName": bios[0].get("refProperName") or fid,
                "licenseType": "351(a)",
                "approvalDate": "",
                "blaNumber": "",
            }

        products_out = []
        if ref and ref.get("proprietaryName"):
            products_out.append(
                {
                    "productId": slugify(ref["proprietaryName"].split(",")[0]),
                    "name": ref["proprietaryName"].split(",")[0].strip(),
                    "type": "reference",
                    "interchangeable": False,
                    "applicant": ref.get("applicant") or "",
                    "approvalYear": approval_year(ref.get("approvalDate") or ""),
                    "blaNumber": ref.get("blaNumber") or "",
                    "properName": ref.get("properName") or "",
                }
            )
        for b in bios:
            lt = b["licenseType"]
            interchangeable = "Interchangeable" in lt
            pname = (b["proprietaryName"] or b["properName"]).split(",")[0].strip()
            if not pname or pname.upper() == "N/A":
                pname = b["properName"]
            products_out.append(
                {
                    "productId": slugify(pname),
                    "name": pname,
                    "type": "biosimilar",
                    "interchangeable": interchangeable,
                    "applicant": b["applicant"],
                    "approvalYear": approval_year(
                        b["interApprovalDate"] or b["approvalDate"]
                    ),
                    "blaNumber": b["blaNumber"],
                    "properName": b["properName"],
                }
            )

        # Dedupe productIds
        seen_pid = set()
        deduped = []
        for pr in products_out:
            pid = pr["productId"]
            base = pid
            n = 2
            while pid in seen_pid:
                pid = f"{base}-{n}"
                n += 1
            pr["productId"] = pid
            seen_pid.add(pid)
            deduped.append(pr)

        ingredient = fid.replace("_", " ")
        ref_brand = deduped[0]["name"] if deduped else fid
        ref_applicant = deduped[0]["applicant"] if deduped else ""
        families.append(
            {
                "familyId": fid,
                "ingredient": ingredient,
                "referenceBrand": ref_brand,
                "referenceApplicant": ref_applicant,
                "therapeuticArea": THERAPEUTIC_AREA.get(fid, "Specialty"),
                "partDRelevant": True,
                "estAnnualPartDSpendUsd": 0,  # filled later from CMS totals
                "products": deduped,
            }
        )
    return families


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--url", default="", help="Override Purple Book CSV URL")
    ap.add_argument(
        "--skip-download",
        action="store_true",
        help="Parse existing data/raw/purple_book.csv only",
    )
    args = ap.parse_args()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    dest = RAW_DIR / "purple_book.csv"
    url = args.url or latest_csv_url()
    if not args.skip_download:
        print(f"Downloading {url}", flush=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as resp:
            dest.write_bytes(resp.read())
        print(f"Saved {dest} ({dest.stat().st_size:,} bytes)", flush=True)
    products = parse_purple_book(dest)
    (RAW_DIR / "purple_book_products.json").write_text(
        json.dumps(
            {
                "source_url": url,
                "downloaded_at": datetime.now(timezone.utc).isoformat(),
                "product_count": len(products),
                "products": products,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    families = build_families(products)
    mapping = {
        "source_url": url,
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
        "family_count": len(families),
        "families": families,
    }
    out = RAW_DIR / "purple_book_families.json"
    out.write_text(json.dumps(mapping, indent=2), encoding="utf-8")
    print(
        f"Wrote {out} with {len(families)} families; "
        f"{sum(len(f['products']) for f in families)} products",
        flush=True,
    )
    for f in families:
        n_bio = sum(1 for p in f["products"] if p["type"] == "biosimilar")
        print(f"  {f['familyId']}: ref={f['referenceBrand']} biosimilars={n_bio}")

    # Monthly changelog (N/R/U + optional snapshot diff) for Alerts UI
    try:
        from build_purple_changelog import build as build_changelog

        build_changelog(skip_archive=False)
    except Exception as exc:  # noqa: BLE001 — ingest should still succeed
        print(f"Warning: purple changelog build failed: {exc}", flush=True)


if __name__ == "__main__":
    main()
