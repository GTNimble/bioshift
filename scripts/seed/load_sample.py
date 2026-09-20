#!/usr/bin/env python3
"""Restore sample seed JSON as the active app data (from data/sample/)."""
from __future__ import annotations
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SAMPLE = ROOT / "data" / "sample"
DATA = ROOT / "data"
PROCESSED = DATA / "processed"

FILES = ("prescribers.json", "drugs.json", "alerts.json", "plans.json")

def main() -> None:
    for name in FILES:
        src = SAMPLE / name
        if not src.exists():
            raise SystemExit(f"Missing sample file: {src}")
        shutil.copy2(src, DATA / name)
        # Also mark processed as sample snapshot for clarity
        PROCESSED.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, PROCESSED / name)
        print(f"Restored {name} from data/sample/")
    meta = {
        "flag": "SAMPLE SEED",
        "note": "Active data restored from data/sample via scripts/seed/load_sample.py",
        "cms_year": None,
    }
    (DATA / "meta.json").write_text(json.dumps(meta, indent=2))
    (PROCESSED / "meta.json").write_text(json.dumps(meta, indent=2))
    print("Active app data is now SAMPLE. Restart Next.js if running.")

if __name__ == "__main__":
    main()
