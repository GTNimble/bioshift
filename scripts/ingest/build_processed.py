#!/usr/bin/env python3
"""Build app-facing processed JSON from filtered CMS + Purple Book raw artifacts.

Outputs under data/processed/:
  - prescribers.json
  - drugs.json (families + products)
  - purple_book.json (same families mapping)
  - alerts.json (derived launch/conversion-style alerts)
  - plans.json (kept sample formulary prefs remapped where possible)
  - meta.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from targets import CMS_API_URL, CMS_CSV_URL, CMS_YEAR, THERAPEUTIC_AREA  # noqa: E402

RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
SAMPLE = ROOT / "data" / "sample"

# Cap per family for demo size: keep top NPIs by brand/total cost, but all rows real.
DEFAULT_TOP_NPIS = 500


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s[:60] or "product"


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def normalize_brand(name: str) -> str:
    n = (name or "").strip()
    # Collapse CMS presentation suffixes for matching: Humira(Cf) Pen -> Humira
    n = re.sub(r"\(.*?\)", "", n)
    n = re.sub(
        r"\b(pen|solostar|kwikpen|sureclick|flexpen|autopen|syringe|kit|cf)\b",
        "",
        n,
        flags=re.I,
    )
    n = re.sub(r"\s+", " ", n).strip()
    return n


def match_product(family: dict, brnd: str, gnrc: str) -> tuple[dict | None, bool, bool]:
    """Return (product, isBrand, isBiosimilar)."""
    products = family["products"]
    nb = normalize_brand(brnd).lower()
    gn = (gnrc or "").lower()

    # Exact / startswith proprietary match
    for p in products:
        pname = p["name"].lower()
        if nb == pname or nb.startswith(pname) or pname.startswith(nb):
            is_bio = p["type"] == "biosimilar"
            return p, not is_bio, is_bio

    # Proper-name / suffix: adalimumab-atto style -> biosimilar if hyphenated 4-letter
    if re.search(r"-[a-z]{4}$", gn.replace(" ", "")) or re.search(
        r"-[a-z]{4}$", gn.split()[-1] if gn else ""
    ):
        # Prefer any biosimilar product; synthesize id from brand if needed
        bios = [p for p in products if p["type"] == "biosimilar"]
        for p in bios:
            if slugify(p["name"]) in slugify(brnd) or p["name"].lower() in nb:
                return p, False, True
        # Match proper name listed on product
        for p in bios:
            proper = (p.get("properName") or "").lower()
            if proper and (proper in gn or gn in proper):
                return p, False, True

    # Reference if gnrc has no biosimilar suffix and matches ingredient
    refs = [p for p in products if p["type"] == "reference"]
    if refs and "-" not in gn.split(",")[0].replace(" ", ""):
        # Heuristic: insulin glargine-yfgn is biosimilar naming
        pass
    # Biosimilar-style CMS generics often end with -Xxxx
    token = gn.replace(",", " ").split()[0] if gn else ""
    if re.search(r"-[a-z0-9]{4}$", gn.replace(" ", "")) or re.search(
        r"-[a-z]{4}$", token
    ):
        # Create ephemeral product mapping to brand name
        pid = slugify(brnd)
        synth = {
            "productId": pid,
            "name": normalize_brand(brnd) or brnd,
            "type": "biosimilar",
            "interchangeable": False,
            "applicant": "",
            "approvalYear": 0,
        }
        return synth, False, True

    if refs:
        return refs[0], True, False

    # Last resort: treat as brand if no hyphen suffix else biosimilar
    if re.search(r"-[a-z]{4}", gn):
        synth = {
            "productId": slugify(brnd),
            "name": normalize_brand(brnd) or brnd,
            "type": "biosimilar",
            "interchangeable": False,
            "applicant": "",
            "approvalYear": 0,
        }
        return synth, False, True
    synth = {
        "productId": slugify(brnd) or "unknown",
        "name": normalize_brand(brnd) or brnd,
        "type": "reference",
        "interchangeable": False,
        "applicant": "",
        "approvalYear": 0,
    }
    return synth, True, False


def is_biosimilar_gnrc(gnrc: str) -> bool:
    g = (gnrc or "").lower().replace(",", " ")
    # e.g. adalimumab-bwwd, insulin glargine-yfgn, filgrastim-sndz, epoetin alfa-epbx
    if re.search(r"-[a-z]{4}\b", g):
        return True
    if g.startswith("tbo-"):
        return True
    return False


def classify_row(family: dict, brnd: str, gnrc: str) -> tuple[str, str, bool, bool]:
    """Return productId, drugName, isBrand, isBiosimilar using Purple Book + CMS naming."""
    products = family.get("products") or []
    nb = normalize_brand(brnd).lower()
    drug_name = normalize_brand(brnd) or brnd

    # Try match to known products by brand name
    for p in products:
        pname = p["name"].lower()
        if not pname:
            continue
        if nb == pname or nb.startswith(pname + " ") or pname == nb.split()[0]:
            is_bio = p["type"] == "biosimilar"
            return p["productId"], p["name"], not is_bio, is_bio
        # CMS often uses product name as first token
        if nb.split()[0] == pname.split()[0] and len(pname) >= 4:
            is_bio = p["type"] == "biosimilar"
            return p["productId"], p["name"], not is_bio, is_bio

    bio = is_biosimilar_gnrc(gnrc)
    # Match biosimilar proper names
    if bio:
        for p in products:
            if p["type"] != "biosimilar":
                continue
            proper = (p.get("properName") or "").lower()
            if proper and proper.replace(" ", "") in gnrc.lower().replace(" ", ""):
                return p["productId"], p["name"], False, True
        pid = slugify(drug_name)
        return pid, drug_name, False, True

    # Reference
    for p in products:
        if p["type"] == "reference":
            return p["productId"], p["name"], True, False
    pid = slugify(drug_name)
    return pid, drug_name, True, False


def ensure_product_on_family(family: dict, product_id: str, name: str, is_bio: bool) -> None:
    if any(p["productId"] == product_id for p in family["products"]):
        return
    family["products"].append(
        {
            "productId": product_id,
            "name": name,
            "type": "biosimilar" if is_bio else "reference",
            "interchangeable": False,
            "applicant": "CMS-observed",
            "approvalYear": 0,
            "source": "cms_brand_name",
        }
    )


def select_top_npis(rows: list[dict], top_n: int) -> list[dict]:
    """Keep all rows for top_n NPIs per family by Tot_Drug_Cst (real CMS only)."""
    if top_n <= 0:
        return rows
    by_fam: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        by_fam[r["familyId"]][r["Prscrbr_NPI"]] += float(r["Tot_Drug_Cst"] or 0)

    keep_npis: dict[str, set[str]] = {}
    for fam, npi_cost in by_fam.items():
        ranked = sorted(npi_cost.items(), key=lambda x: -x[1])[:top_n]
        keep_npis[fam] = {n for n, _ in ranked}

    return [r for r in rows if r["Prscrbr_NPI"] in keep_npis.get(r["familyId"], set())]


def build_alerts(families: list[dict], presc_rows: list[dict]) -> list[dict]:
    alerts = []
    spend_by_fam = defaultdict(float)
    brand_claims = defaultdict(float)
    bio_claims = defaultdict(float)
    for r in presc_rows:
        if r["isBrand"]:
            spend_by_fam[r["familyId"]] += r["Tot_Drug_Cst"]
            brand_claims[r["familyId"]] += r["Tot_Clms"]
        if r["isBiosimilar"]:
            bio_claims[r["familyId"]] += r["Tot_Clms"]

    for f in families:
        bios = [p for p in f["products"] if p["type"] == "biosimilar"]
        if not bios:
            continue
        fid = f["familyId"]
        total = brand_claims[fid] + bio_claims[fid]
        share = bio_claims[fid] / total if total else 0
        recent = sorted(
            [p for p in bios if p.get("approvalYear", 0) >= 2023],
            key=lambda p: -p.get("approvalYear", 0),
        )
        if recent:
            alerts.append(
                {
                    "id": f"launch-{fid}",
                    "type": "launch",
                    "severity": "high" if spend_by_fam[fid] > 1e7 else "medium",
                    "title": f"Biosimilars vs {f['referenceBrand']} ({f['ingredient']})",
                    "familyId": fid,
                    "brand": f["referenceBrand"],
                    "biosimilars": [p["name"] for p in bios[:6]],
                    "message": (
                        f"Purple Book lists {len(bios)} biosimilar(s) for {f['ingredient']}. "
                        f"CMS Part D CY{CMS_YEAR} filtered extract shows brand gross cost "
                        f"${spend_by_fam[fid]:,.0f} with biosimilar claim share {share:.0%}."
                    ),
                    "estBrandSpendUsd": int(spend_by_fam[fid]),
                    "publishedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                }
            )
        elif share < 0.35 and spend_by_fam[fid] > 5e5:
            alerts.append(
                {
                    "id": f"conv-{fid}",
                    "type": "conversion",
                    "severity": "medium",
                    "title": f"Elevated brand share — {f['referenceBrand']}",
                    "familyId": fid,
                    "brand": f["referenceBrand"],
                    "biosimilars": [p["name"] for p in bios[:6]],
                    "message": (
                        f"Biosimilar claim share is {share:.0%} in the filtered CMS Part D "
                        f"CY{CMS_YEAR} extract for {f['ingredient']}."
                    ),
                    "estBrandSpendUsd": int(spend_by_fam[fid]),
                    "publishedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                }
            )
    return alerts[:12]


def remap_plans(families: list[dict]) -> dict:
    """Keep sample plan structure; remap preferred products to real family productIds."""
    sample_path = SAMPLE / "plans.json"
    if sample_path.exists():
        sample = json.loads(sample_path.read_text())
    else:
        sample = {"plans": []}
    fam_map = {f["familyId"]: f for f in families}
    plans = []
    for plan in sample.get("plans", []):
        preferred = {}
        for fid, f in fam_map.items():
            bios = [p for p in f["products"] if p["type"] == "biosimilar"]
            inter = [p for p in bios if p.get("interchangeable")]
            pick = (inter or bios or f["products"])[0]
            preferred[fid] = pick["productId"]
        plans.append(
            {
                "planId": plan["planId"],
                "planName": plan["planName"],
                "pbm": plan["pbm"].replace("(sample)", "(demo preferences)"),
                "preferredByFamily": preferred,
            }
        )
    if not plans:
        preferred = {}
        for f in families:
            bios = [p for p in f["products"] if p["type"] == "biosimilar"]
            if bios:
                preferred[f["familyId"]] = bios[0]["productId"]
        plans = [
            {
                "planId": "demo-pbm-a",
                "planName": "Summit Part D Choice",
                "pbm": "Summit Rx Solutions (demo preferences)",
                "preferredByFamily": preferred,
            }
        ]
    return {
        "note": (
            "Demo Part D plan formulary preferences for gap analysis. "
            "Not sourced from CMS formulary PUF."
        ),
        "plans": plans,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--top-npis", type=int, default=DEFAULT_TOP_NPIS)
    ap.add_argument("--no-cap", action="store_true", help="Keep all filtered CMS rows")
    args = ap.parse_args()

    cms_path = RAW / "cms_partd_filtered.jsonl"
    fam_path = RAW / "purple_book_families.json"
    if not cms_path.exists():
        raise SystemExit(f"Missing {cms_path}; run download_cms_partd.py first")
    if not fam_path.exists():
        raise SystemExit(f"Missing {fam_path}; run download_purple_book.py first")

    print("Loading CMS filtered rows…", flush=True)
    raw_rows = load_jsonl(cms_path)
    print(f"  {len(raw_rows):,} rows", flush=True)
    pb = json.loads(fam_path.read_text())
    families = pb["families"]
    # Ensure therapeutic areas
    for f in families:
        f.setdefault("therapeuticArea", THERAPEUTIC_AREA.get(f["familyId"], "Specialty"))
        f.setdefault("partDRelevant", True)
        f.setdefault("estAnnualPartDSpendUsd", 0)

    fam_ids_in_cms = {r["familyId"] for r in raw_rows}
    # Add empty shell families only if CMS has them but Purple Book miss
    existing = {f["familyId"] for f in families}
    for fid in sorted(fam_ids_in_cms - existing):
        families.append(
            {
                "familyId": fid,
                "ingredient": fid.replace("_", " "),
                "referenceBrand": fid.replace("_", " ").title(),
                "referenceApplicant": "",
                "therapeuticArea": THERAPEUTIC_AREA.get(fid, "Specialty"),
                "partDRelevant": True,
                "estAnnualPartDSpendUsd": 0,
                "products": [],
            }
        )

    top_n = 0 if args.no_cap else args.top_npis
    if top_n:
        print(f"Capping to top {top_n} NPIs by Tot_Drug_Cst per family…", flush=True)
        capped = select_top_npis(raw_rows, top_n)
        print(f"  {len(raw_rows):,} → {len(capped):,} rows", flush=True)
    else:
        capped = raw_rows

    fam_map = {f["familyId"]: f for f in families}
    presc_rows = []
    spend_by_fam = defaultdict(float)
    for i, r in enumerate(capped):
        fam = fam_map.get(r["familyId"])
        if not fam:
            continue
        pid, dname, is_brand, is_bio = classify_row(fam, r["Brnd_Name"], r["Gnrc_Name"])
        ensure_product_on_family(fam, pid, dname, is_bio)
        spend_by_fam[r["familyId"]] += float(r["Tot_Drug_Cst"] or 0)
        presc_rows.append(
            {
                "id": f"cms-{i}",
                "npi": r["Prscrbr_NPI"],
                "providerLastName": r["Prscrbr_Last_Org_Name"],
                "providerFirstName": r["Prscrbr_First_Name"],
                "state": r["Prscrbr_State_Abrvtn"],
                "specialty": r["Prscrbr_Type"] or "Unknown",
                "familyId": r["familyId"],
                "productId": pid,
                "drugName": dname,
                "isBrand": is_brand,
                "isBiosimilar": is_bio,
                "Tot_Clms": int(r["Tot_Clms"] or 0),
                "Tot_Drug_Cst": round(float(r["Tot_Drug_Cst"] or 0), 2),
                "Tot_Benes": int(r["Tot_Benes"] or 0),
                "Gnrc_Name": r["Gnrc_Name"],
                "Brnd_Name": r["Brnd_Name"],
            }
        )

    for f in families:
        f["estAnnualPartDSpendUsd"] = int(spend_by_fam.get(f["familyId"], 0))

    # Drop families with no CMS rows in the processed set
    used = {r["familyId"] for r in presc_rows}
    families = [f for f in families if f["familyId"] in used]

    alerts = build_alerts(families, presc_rows)
    plans = remap_plans(families)

    PROCESSED.mkdir(parents=True, exist_ok=True)

    cms_meta_path = RAW / "cms_partd_download_meta.json"
    cms_meta = json.loads(cms_meta_path.read_text()) if cms_meta_path.exists() else {}

    drugs_out = {
        "note": (
            f"FDA Purple Book linkages + CMS Part D CY{CMS_YEAR} filtered to "
            "biosimilar-relevant molecules. Not a full national dump."
        ),
        "families": families,
    }
    presc_out = {
        "note": (
            f"REAL CMS PUF — Part D Prescribers by Provider and Drug CY{CMS_YEAR}, "
            "filtered to biosimilar-relevant molecules"
            + (f" (top {top_n} NPIs/family by Tot_Drug_Cst)" if top_n else "")
            + ". Gross cost; beneficiary counts may be suppressed."
        ),
        "yearLabel": f"CY{CMS_YEAR}",
        "rowCount": len(presc_rows),
        "rows": presc_rows,
    }
    purple_out = {
        "note": "FDA Purple Book reference → biosimilar/interchangeable mapping",
        "source_url": pb.get("source_url"),
        "downloaded_at": pb.get("downloaded_at"),
        "families": families,
    }
    alerts_out = {
        "note": (
            "Alerts derived from Purple Book product lists + filtered CMS Part D spend. "
            "Not a live FDA push feed."
        ),
        "alerts": alerts,
    }
    meta = {
        "flag": "REAL CMS PUF",
        "cms_year": CMS_YEAR,
        "cms_csv_url": CMS_CSV_URL,
        "cms_api_url": CMS_API_URL,
        "purple_book_url": pb.get("source_url"),
        "extract_date": datetime.now(timezone.utc).isoformat(),
        "filtered_cms_rows_raw": cms_meta.get("kept_rows", len(raw_rows)),
        "processed_prescriber_rows": len(presc_rows),
        "unique_npis": len({r["npi"] for r in presc_rows}),
        "families": len(families),
        "molecules": sorted(f["familyId"] for f in families),
        "by_family_rows": {
            fid: sum(1 for r in presc_rows if r["familyId"] == fid)
            for fid in sorted(used)
        },
        "top_npis_per_family_cap": top_n or None,
        "cms_download_meta": cms_meta,
        "honesty": [
            "Filtered to biosimilar-relevant molecules — not a full national dump",
            "Tot_Drug_Cst is gross Part D drug cost (not net of rebates/DIR)",
            "Tot_Benes may be CMS-suppressed for small cells",
            "Plan formulary preferences remain demo-only (not CMS formulary PUF)",
        ],
    }

    def dump(name: str, obj: dict) -> Path:
        path = PROCESSED / name
        path.write_text(json.dumps(obj), encoding="utf-8")
        mb = path.stat().st_size / (1024 * 1024)
        print(f"  wrote {path.relative_to(ROOT)} ({mb:.2f} MB)")
        return path

    print("Writing processed outputs…")
    dump("drugs.json", drugs_out)
    dump("prescribers.json", presc_out)
    dump("purple_book.json", purple_out)
    dump("alerts.json", alerts_out)
    dump("plans.json", plans)
    dump("meta.json", meta)

    # Also copy to data/ root for Next.js imports (app loads processed via data.ts)
    for name in ("drugs.json", "prescribers.json", "alerts.json", "plans.json", "meta.json"):
        src = PROCESSED / name
        dst = ROOT / "data" / name
        dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"  synced data/{name}")

    print("Done.")
    print(json.dumps({k: meta[k] for k in ("flag", "cms_year", "processed_prescriber_rows", "unique_npis", "molecules")}, indent=2))


if __name__ == "__main__":
    main()
