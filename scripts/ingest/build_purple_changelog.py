#!/usr/bin/env python3
"""Build Purple Book monthly changelog for PurpleGap tracked families.

Sources (in priority order):
  1) FDA monthly CSV N/R/U section (Newly approved / Added / Updated)
  2) Optional snapshot-to-snapshot BLA product diff when a prior month exists

Honesty: derived from FDA Purple Book *monthly download*, not a real-time
approvals push feed. With a single month on disk, N/R/U from that file still
ships; snapshot diff fields are empty / clearly labeled.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from targets import THERAPEUTIC_AREA, assign_family  # noqa: E402

RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
DATA = ROOT / "data"
SNAPSHOTS = RAW / "purple_book_snapshots"

MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

CHANGE_LABELS = {
    "N": "Newly approved",
    "R": "Added in release",
    "U": "Updated",
}


def family_from_proper(proper: str, ref_proper: str) -> str | None:
    for candidate in (ref_proper, proper):
        fid = assign_family(candidate)
        if fid:
            return fid
    base = re.sub(r"-[a-z]{4}$", "", (proper or "").lower())
    return assign_family(base)


def stamp_from_url_or_title(url: str, csv_path: Path) -> str:
    m = re.search(r"purplebook-search-([A-Za-z]+)-data-download", url or "")
    y = re.search(r"/(\d{4})/", url or "")
    if m and y:
        mon = MONTHS.get(m.group(1).lower())
        if mon:
            return f"{y.group(1)}-{mon:02d}"
    # Fall back to first-line title in CSV
    try:
        first = csv_path.read_text(encoding="utf-8", errors="replace").splitlines()[0]
        tm = re.search(
            r"(January|February|March|April|May|June|July|August|September|"
            r"October|November|December)\s+(\d{4})",
            first,
            re.I,
        )
        if tm:
            mon = MONTHS[tm.group(1).lower()]
            return f"{tm.group(2)}-{mon:02d}"
    except OSError:
        pass
    return datetime.now(timezone.utc).strftime("%Y-%m")


def product_key(p: dict) -> str:
    return "|".join(
        [
            (p.get("blaNumber") or "").strip(),
            (p.get("proprietaryName") or "").strip().lower(),
            (p.get("properName") or "").strip().lower(),
            (p.get("licenseType") or "").strip().lower(),
        ]
    )


def dedupe_key_nru(row: dict) -> tuple:
    return (
        (row.get("changeType") or "").strip(),
        (row.get("blaNumber") or "").strip(),
        (row.get("proprietaryName") or "").strip().lower().split(",")[0],
        (row.get("properName") or "").strip().lower(),
    )


def parse_nru_section(csv_path: Path) -> list[dict]:
    """Parse the monthly changes (first N/R/U header block)."""
    with csv_path.open(encoding="utf-8", errors="replace", newline="") as f:
        rows = list(csv.reader(f))
    header_idxs = [i for i, r in enumerate(rows) if r and r[0] == "N/R/U"]
    if not header_idxs:
        return []
    hi = header_idxs[0]
    end = header_idxs[1] if len(header_idxs) > 1 else len(rows)
    header = rows[hi]
    out: list[dict] = []
    for r in rows[hi + 1 : end]:
        if not r or not r[0].strip():
            continue
        if r[0] not in ("N", "R", "U"):
            continue
        while len(r) < len(header):
            r.append("")
        d = dict(zip(header, r))
        proper = (d.get("Proper Name") or "").strip()
        prop = (d.get("Proprietary Name") or "").strip()
        if not proper and not prop:
            continue
        out.append(
            {
                "changeType": r[0].strip(),
                "applicant": (d.get("Applicant") or "").strip(),
                "blaNumber": (d.get("BLA Number") or "").strip(),
                "proprietaryName": prop,
                "properName": proper,
                "licenseType": (d.get("License Type") or "").strip(),
                "approvalDate": (d.get("Approval Date") or "").strip(),
                "interApprovalDate": (d.get("Inter. Approval Date") or "").strip(),
                "refProperName": (d.get("Ref. Product Proper Name") or "").strip(),
                "refProprietaryName": (d.get("Ref. Product Proprietary Name") or "").strip(),
                "marketingStatus": (d.get("Marketing Status") or "").strip(),
            }
        )
    return out


def load_products_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def list_snapshot_stamps() -> list[str]:
    if not SNAPSHOTS.exists():
        return []
    stamps = sorted(
        p.name for p in SNAPSHOTS.iterdir() if p.is_dir() and re.match(r"^\d{4}-\d{2}$", p.name)
    )
    return stamps


def snapshot_diff(prior_products: list[dict], latest_products: list[dict]) -> list[dict]:
    """BLA-level add / update signals for tracked families only."""
    prior_map = {product_key(p): p for p in prior_products}
    latest_map = {product_key(p): p for p in latest_products}
    changes: list[dict] = []
    for key, p in latest_map.items():
        fid = family_from_proper(p.get("properName", ""), p.get("refProperName", ""))
        if not fid:
            continue
        if key not in prior_map:
            # Prefer N for biosimilar/new; R for reference add
            lt = p.get("licenseType") or ""
            ctype = "N" if ("351(k)" in lt or "Biosimilar" in lt or "Interchangeable" in lt) else "R"
            changes.append({**p, "changeType": ctype, "_source": "snapshot_diff"})
        else:
            prev = prior_map[key]
            watched = (
                "licenseType",
                "marketingStatus",
                "interApprovalDate",
                "approvalDate",
            )
            if any((prev.get(f) or "") != (p.get(f) or "") for f in watched):
                changes.append({**p, "changeType": "U", "_source": "snapshot_diff"})
    return changes


def display_name(prop: str, proper: str) -> str:
    name = (prop or "").split(",")[0].strip()
    if not name or name.upper() == "N/A":
        name = proper
    return name or "Unknown product"


def severity_for(change_type: str, license_type: str) -> str:
    lt = license_type or ""
    bio = "351(k)" in lt or "Biosimilar" in lt or "Interchangeable" in lt
    if change_type == "N" and bio:
        return "high"
    if change_type == "N":
        return "medium"
    if change_type == "R" and bio:
        return "medium"
    if "Interchangeable" in lt and change_type == "U":
        return "high"
    return "low"


def to_alert_row(row: dict, report_month: str, source: str) -> dict | None:
    fid = family_from_proper(row.get("properName", ""), row.get("refProperName", ""))
    if not fid:
        return None
    ctype = row["changeType"]
    lt = row.get("licenseType") or ""
    pname = display_name(row.get("proprietaryName", ""), row.get("properName", ""))
    brand = (row.get("refProprietaryName") or "").split(",")[0].strip() or fid.replace("_", " ")
    interchangeable = "Interchangeable" in lt
    label = CHANGE_LABELS.get(ctype, ctype)
    date_bit = row.get("interApprovalDate") or row.get("approvalDate") or ""
    date_msg = f" Approval/update date: {date_bit}." if date_bit else ""
    msg = (
        f"{label} in FDA Purple Book monthly download for {fid.replace('_', ' ')}: "
        f"{pname} ({lt or 'license n/a'}).{date_msg} "
        f"Source: FDA Purple Book monthly file — not a real-time approvals feed."
    )
    slug = re.sub(r"[^a-z0-9]+", "-", pname.lower()).strip("-")[:40] or "product"
    bla = row.get("blaNumber") or "nobla"
    return {
        "id": f"{ctype.lower()}-{fid}-{bla}-{slug}",
        "changeType": ctype,
        "changeLabel": label,
        "type": "purple_book",
        "severity": severity_for(ctype, lt),
        "title": f"{label}: {pname} ({fid.replace('_', ' ')})",
        "familyId": fid,
        "ingredient": fid.replace("_", " "),
        "therapeuticArea": THERAPEUTIC_AREA.get(fid, "Specialty"),
        "brand": brand,
        "productName": pname,
        "properName": row.get("properName") or "",
        "blaNumber": row.get("blaNumber") or "",
        "licenseType": lt,
        "interchangeable": interchangeable,
        "applicant": row.get("applicant") or "",
        "approvalDate": row.get("approvalDate") or "",
        "interApprovalDate": row.get("interApprovalDate") or "",
        "message": msg,
        "publishedAt": report_month,
        "source": source,
    }


def in_scope_biosimilars(products: list[dict], limit: int = 40) -> list[dict]:
    """Current in-scope biosimilar/interchangeable products (fallback feed)."""
    items: list[dict] = []
    seen: set[tuple] = set()
    for p in products:
        fid = family_from_proper(p.get("properName", ""), p.get("refProperName", ""))
        if not fid:
            continue
        lt = p.get("licenseType") or ""
        if not ("351(k)" in lt or "Biosimilar" in lt or "Interchangeable" in lt):
            continue
        pname = display_name(p.get("proprietaryName", ""), p.get("properName", ""))
        key = (fid, (p.get("blaNumber") or ""), pname.lower())
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "familyId": fid,
                "ingredient": fid.replace("_", " "),
                "productName": pname,
                "properName": p.get("properName") or "",
                "blaNumber": p.get("blaNumber") or "",
                "licenseType": lt,
                "interchangeable": "Interchangeable" in lt,
                "applicant": p.get("applicant") or "",
                "approvalDate": p.get("approvalDate") or "",
                "interApprovalDate": p.get("interApprovalDate") or "",
                "brand": (p.get("refProprietaryName") or "").split(",")[0].strip()
                or fid.replace("_", " "),
            }
        )

    def sort_key(it: dict) -> tuple:
        # Prefer items with newer-looking year in approval date string
        d = it.get("interApprovalDate") or it.get("approvalDate") or ""
        m = re.search(r"(\d{2,4})$", d.strip())
        y = 0
        if m:
            y = int(m.group(1))
            if y < 100:
                y += 2000 if y < 70 else 1900
        return (-y, it["familyId"], it["productName"])

    items.sort(key=sort_key)
    return items[:limit]


def archive_snapshot(csv_path: Path, products_path: Path, source_url: str, stamp: str) -> Path:
    dest = SNAPSHOTS / stamp
    dest.mkdir(parents=True, exist_ok=True)
    if csv_path.exists():
        (dest / "purple_book.csv").write_bytes(csv_path.read_bytes())
    if products_path.exists():
        (dest / "purple_book_products.json").write_text(
            products_path.read_text(encoding="utf-8"), encoding="utf-8"
        )
    meta = {
        "stamp": stamp,
        "source_url": source_url,
        "archived_at": datetime.now(timezone.utc).isoformat(),
    }
    (dest / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return dest


def build(skip_archive: bool = False) -> dict:
    csv_path = RAW / "purple_book.csv"
    products_path = RAW / "purple_book_products.json"
    if not csv_path.exists():
        raise SystemExit(
            f"Missing {csv_path}. Run: npm run data:purple  (or download_purple_book.py)"
        )

    products_doc = load_products_json(products_path)
    source_url = products_doc.get("source_url") or ""
    stamp = stamp_from_url_or_title(source_url, csv_path)

    if not skip_archive:
        archive_snapshot(csv_path, products_path, source_url, stamp)

    nru_rows = parse_nru_section(csv_path)
    stamps = list_snapshot_stamps()
    prior_stamp = None
    for s in reversed(stamps):
        if s < stamp:
            prior_stamp = s
            break

    modes: list[str] = []
    alert_rows: list[dict] = []
    seen_ids: set[str] = set()

    # 1) FDA N/R/U section (works with a single monthly file)
    deduped_nru: list[dict] = []
    seen_dk: set = set()
    for row in nru_rows:
        dk = dedupe_key_nru(row)
        if dk in seen_dk:
            continue
        alert = to_alert_row(row, stamp, "fda_nru_section")
        if not alert:
            continue
        seen_dk.add(dk)
        deduped_nru.append(alert)

    if deduped_nru:
        modes.append("nru_section")
        for a in deduped_nru:
            if a["id"] not in seen_ids:
                seen_ids.add(a["id"])
                alert_rows.append(a)

    # 2) Snapshot diff when prior month archived
    diff_count = 0
    if prior_stamp:
        prior_doc = load_products_json(
            SNAPSHOTS / prior_stamp / "purple_book_products.json"
        )
        prior_products = prior_doc.get("products") or []
        latest_products = products_doc.get("products") or []
        if prior_products and latest_products:
            modes.append("snapshot_diff")
            for row in snapshot_diff(prior_products, latest_products):
                src = row.pop("_source", "snapshot_diff")
                alert = to_alert_row(row, stamp, src)
                if not alert:
                    continue
                if alert["id"] in seen_ids:
                    continue
                # Avoid duplicating N/R/U already listed
                seen_ids.add(alert["id"])
                alert_rows.append(alert)
                diff_count += 1

    # Sort: N high first, then R, then U; within by family
    order = {"N": 0, "R": 1, "U": 2}
    sev_order = {"high": 0, "medium": 1, "low": 2}
    alert_rows.sort(
        key=lambda a: (
            order.get(a["changeType"], 9),
            sev_order.get(a["severity"], 9),
            a["familyId"],
            a["productName"],
        )
    )

    latest_products = products_doc.get("products") or []
    scope_feed = in_scope_biosimilars(latest_products)

    has_prior = prior_stamp is not None
    empty_reason = None
    if not alert_rows:
        if not has_prior:
            empty_reason = (
                "No in-scope N/R/U rows in the latest FDA monthly file and no prior "
                "month snapshot to diff. Showing current in-scope Purple Book "
                "biosimilars feed below."
            )
            if "single_snapshot_scope" not in modes:
                modes.append("single_snapshot_scope")
        else:
            empty_reason = (
                f"No tracked-family changes vs prior snapshot {prior_stamp} and no "
                "in-scope N/R/U rows in the monthly changes section."
            )

    stats: dict[str, int] = defaultdict(int)
    for a in alert_rows:
        stats[a["changeType"]] += 1
    stats["in_scope"] = len(alert_rows)

    payload = {
        "note": (
            "FDA Purple Book monthly download changelog for PurpleGap molecule "
            "families. Not a real-time FDA approvals feed."
        ),
        "source": "FDA Purple Book monthly download",
        "source_url": source_url,
        "report_month": stamp,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "+".join(modes) if modes else "empty",
        "prior_snapshot": prior_stamp,
        "has_prior_month": has_prior,
        "empty_reason": empty_reason,
        "stats": dict(stats),
        "changes": alert_rows,
        "inScopeProducts": scope_feed,
    }

    RAW.mkdir(parents=True, exist_ok=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    raw_out = RAW / "purple_book_changelog.json"
    proc_out = PROCESSED / "purple_book_changelog.json"
    data_out = DATA / "purple_book_changelog.json"
    text = json.dumps(payload, indent=2)
    for path in (raw_out, proc_out, data_out):
        path.write_text(text, encoding="utf-8")

    print(
        f"Changelog {stamp}: {len(alert_rows)} in-scope change(s) "
        f"(N={stats.get('N', 0)} R={stats.get('R', 0)} U={stats.get('U', 0)}); "
        f"mode={payload['mode']}; prior={prior_stamp or 'none'}; "
        f"inScopeProducts={len(scope_feed)}",
        flush=True,
    )
    for a in alert_rows[:20]:
        print(
            f"  [{a['changeType']}] {a['familyId']}: {a['productName']} "
            f"({a['licenseType']})",
            flush=True,
        )
    return payload


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--skip-archive",
        action="store_true",
        help="Do not copy current CSV/products into purple_book_snapshots/",
    )
    args = ap.parse_args()
    build(skip_archive=args.skip_archive)


if __name__ == "__main__":
    main()
