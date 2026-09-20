#!/usr/bin/env python3
"""Probe CMS API for Gnrc_Name values from Purple Book proper names + known list."""
from __future__ import annotations
import json, re, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from targets import CMS_API_URL, KNOWN_GNRC_NAMES, assign_family

UA = "bioshift-ingest/1.0"

def cms_style(proper: str) -> list[str]:
    p = (proper or "").strip()
    if not p:
        return []
    out = set()
    def title_hyphen(s):
        parts = []
        for tok in s.split("-"):
            parts.append("-".join(w[:1].upper() + w[1:].lower() if w else "" for w in tok.split()))
        return "-".join(parts)
    out.add(title_hyphen(p))
    out.add(p.title())
    return [x for x in out if x]

def main() -> None:
    pb_path = ROOT / "data/raw/purple_book_products.json"
    if not pb_path.exists():
        raise SystemExit("Run download_purple_book.py first")
    pb = json.loads(pb_path.read_text())
    candidates = set(KNOWN_GNRC_NAMES)
    extras = [
        "Insulin Aspart Prot/Insuln Asp",
        "Insulin Lispro Protamin/Lispro",
    ]
    candidates.update(extras)
    for prod in pb["products"]:
        for field in ("properName", "refProperName"):
            name = prod.get(field) or ""
            if assign_family(name):
                candidates.update(cms_style(name))
                base = re.sub(r"-[a-z]{4}$", "", name, flags=re.I)
                if base != name and assign_family(base):
                    candidates.update(cms_style(base))
    hits = []
    for name in sorted(candidates):
        q = urllib.parse.urlencode({"filter[Gnrc_Name]": name, "size": "1"})
        url = f"{CMS_API_URL}?{q}"
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as resp:
            d = json.load(resp)
        if d:
            hits.append(d[0]["Gnrc_Name"])
            print("HIT", name, "=>", d[0]["Gnrc_Name"])
    hits = sorted(set(hits))
    out = ROOT / "data/raw/cms_gnrc_names.json"
    out.write_text(json.dumps({"hits": hits}, indent=2))
    print(f"Wrote {out} ({len(hits)} names)")

if __name__ == "__main__":
    main()
