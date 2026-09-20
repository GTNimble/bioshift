#!/usr/bin/env python3
"""Add concentration / risk-flag scoring onto existing Open Payments profiles.

Does not re-fetch CMS — enriches data/processed/open_payments.json in place.

  npm run data:openpayments:score
  python3 scripts/ingest/score_open_payments.py
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / "data" / "processed" / "open_payments.json"
SYNC = ROOT / "data" / "open_payments.json"


def score_profile(p: dict) -> dict:
    general = float(p.get("generalTotalUsd") or 0)
    research = float(p.get("researchTotalUsd") or 0)
    ownership = float(p.get("ownershipTotalUsd") or 0)
    total = float(p.get("totalUsd") or (general + research + ownership))
    companies = p.get("topCompanies") or []
    top = float(companies[0].get("amountUsd") or 0) if companies else 0.0
    concentration = (top / general) if general > 0 and top > 0 else 0.0

    mag = min(70.0, (math.log10(general + 1) / 5.0) * 70.0) if general > 0 else 0.0
    conc_pts = min(30.0, concentration * 30.0)
    score = round(min(100.0, mag + conc_pts), 1)

    flags: list[str] = []
    if general >= 10000:
        flags.append("high_general")
    if concentration >= 0.5 and general >= 1000:
        flags.append("concentrated_payer")
    if research >= 1000:
        flags.append("research_active")
    if ownership > 0:
        flags.append("ownership_interest")

    p["score"] = score
    p["topCompanyConcentration"] = round(concentration, 4)
    p["topCompanyName"] = companies[0].get("name") if companies else None
    p["topCompanyAmountUsd"] = round(top, 2) if companies else 0.0
    p["flags"] = flags
    return p


def main() -> int:
    if not PATH.exists():
        print(f"Missing {PATH} — run npm run data:openpayments first")
        return 1
    data = json.loads(PATH.read_text(encoding="utf-8"))
    profiles = data.get("profiles") or {}
    for _npi, prof in profiles.items():
        score_profile(prof)
    data["scoring"] = {
        "version": 1,
        "note": (
            "score=log-scaled general payments + top-company concentration. "
            "Flags are heuristic labels for field prioritization — not compliance findings."
        ),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    text = json.dumps(data)
    PATH.write_text(text, encoding="utf-8")
    SYNC.write_text(text, encoding="utf-8")
    flagged = sum(1 for p in profiles.values() if p.get("flags"))
    print(json.dumps({"profiles": len(profiles), "withFlags": flagged, "out": str(PATH.relative_to(ROOT))}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
