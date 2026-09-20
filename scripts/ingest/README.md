# Real data ingest (CMS Part D + FDA Purple Book)

Active app data lives in `data/processed/` (synced to `data/*.json` for Next.js imports).
Sample CMS-shaped seed is archived under `data/sample/` and can be restored with `npm run data:sample`.

## Quick refresh

```bash
cd /workspace/bioshift

# 1) Purple Book monthly CSV → family map
npm run data:purple

# 2) Discover / refresh Gnrc_Name hit list (optional; file usually exists)
#    python3 -c '...'  # or re-run discovery helper; see download_cms_partd.py

# 3) CMS Part D CY2024 via API (filtered by Gnrc_Name)
npm run data:cms

# 4) Build processed JSON (caps top 500 NPIs/family by Tot_Drug_Cst)
npm run data:build

# Or one-shot (uses existing cms_gnrc_names.json):
npm run data:ingest
```

Restart the app after rebuilding data:

```bash
npm run build && npm start
# or: npm run dev
```

## Modes

| Command | What it does |
|---------|----------------|
| `npm run data:cms` | Paginate CMS data API for known `Gnrc_Name` values → `data/raw/cms_partd_filtered.jsonl` |
| `npm run data:cms:csv` | Stream the ~4GB national CSV and filter by molecule stems (no full load into RAM) |
| `npm run data:purple` | Download latest Purple Book CSV; emit `purple_book_families.json`; archive snapshot + build changelog |
| `npm run data:purple:changelog` | Rebuild changelog from on-disk CSV/products (N/R/U + optional snapshot diff) → `purple_book_changelog.json` |
| `npm run data:build` / `data:real` | Produce `data/processed/*` and sync to `data/*.json` |
| `npm run data:sample` | Restore archived sample seed as active data |

### Cap size

```bash
python3 scripts/ingest/build_processed.py --top-npis 500   # default
python3 scripts/ingest/build_processed.py --no-cap         # all filtered rows (large)
```

Every retained row is a real CMS PUF record — NPIs are never invented.

## Sources

- **CMS CSV:** https://data.cms.gov/sites/default/files/2026-05/0ae165f4-eb44-495d-8cac-67f4571b6b83/MUP_DPR_RY26_P04_V10_DY24_NPIBN.csv
- **CMS API:** https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data
- **Purple Book:** https://purplebooksearch.fda.gov/downloads

Provenance for the active feed: `data/processed/meta.json` (`flag: "REAL CMS PUF"`, `cms_year: 2024`).

## Honesty / limitations

- Filtered to biosimilar-relevant molecules — **not** a full national dump
- Demo may further keep top NPIs per family by gross `Tot_Drug_Cst`
- `Tot_Drug_Cst` is **gross** Part D cost (not net of rebates/DIR)
- `Tot_Benes` may be CMS-suppressed
- Plan formulary gap prefs remain demo-only (not formulary PUF)
- Sample seed path preserved under `data/sample/` + `scripts/seed/`

## Matching notes

1. Molecule stems / Purple Book proper names → CMS `Gnrc_Name` (incl. biosimilar suffixes like `Adalimumab-Bwwd`)
2. Purple Book `351(a)` vs `351(k)` (+ interchangeable) builds family product lists
3. CMS brand names mapped to Purple Book proprietary names where possible; unmatched biosimilar-suffix generics still flagged `isBiosimilar`


## Purple Book monthly changelog (Alerts)

FDA ships each monthly CSV with an **N / R / U** section (Newly approved / Added in current release / Updated). PurpleGap:

1. Downloads the latest file (`npm run data:purple`)
2. Archives it under `data/raw/purple_book_snapshots/YYYY-MM/`
3. Builds `data/purple_book_changelog.json` filtered to tracked molecule families (`targets.py`)

**Formula / approach**

- Primary: parse the monthly changes block (`N/R/U` column) and keep rows whose proper / reference proper name maps to a PurpleGap `familyId`
- Deduplicate strength/presentation variants by `(changeType, BLA, proprietaryName, properName)`
- When a **prior** snapshot exists: also BLA-level product diff (new → N/R, watched-field change → U)
- With **only one month** on disk: still ship the FDA N/R/U in-scope rows; `has_prior_month: false` and UI empty-states explain there is no month-to-month diff yet. Fallback feed: `inScopeProducts` (current biosimilar/interchangeable products in scope)

Honesty label in UI: **FDA Purple Book monthly download — not a real-time FDA approvals feed.**

```bash
npm run data:purple              # download + archive + changelog
npm run data:purple:changelog    # changelog only (uses existing CSV)
```

## NPPES provider contacts (Pro / Enterprise)

Public [NPPES NPI Registry API](https://npiregistry.cms.hhs.gov/api/) — practice LOCATION address + phone (+ fax if present). **No clinician email** in the public registry; UI and exports state that explicitly. Outreach remains subject to TCPA. No API key required.

```bash
# Demo seed: top ~200 NPIs by brand Tot_Drug_Cst (resume-safe, ~8 req/s)
npm run data:nppes

# Full refresh of every unique NPI in data/prescribers.json
npm run data:nppes:all

# Or directly:
python3 scripts/ingest/enrich_nppes_contacts.py --limit 200
python3 scripts/ingest/enrich_nppes_contacts.py --all --force
```

Output: `data/processed/nppes_contacts.json` keyed by NPI. Detail API live-fetches once on cache miss and writes back. Free plan never receives phone/address (`contact: { locked: true }`).

## Open Payments (Pro+ overlay)

```bash
npm run data:openpayments          # top 50 opportunity NPIs
npm run data:openpayments:all      # all unique NPIs (slow)
```

Output: `data/processed/open_payments.json`. Queries CMS Open Payments API by NPI (general + research + ownership for the chosen program year). See root README § Open Payments.

## Part D drug spending (market context)

```bash
npm run data:partd-spend
# python3 scripts/ingest/download_partd_spend.py [--offline-sample]
```

Writes `data/processed/partd_drug_spend.json` from CMS **Medicare Part D Spending by Drug** (filtered to PurpleGap Gnrc_Name / Overall manufacturer rows). Surfaced as market-context KPIs on Drugs + Makers.

**Honesty:** gross Part D national spend (not net of rebates/DIR); lagged annual; not NPI-level.

## Part B Practitioner PUF (infused / buy-and-bill)

```bash
npm run data:partb
# python3 scripts/ingest/download_partb_practitioners.py --top 40 [--codes J1745,J9312,...] [--offline-sample]
```

Writes `data/processed/partb_practitioners.json` — top NPIs per in-scope biologic HCPCS from Physician & Other Practitioners by Provider and Service. UI: `/partb`.

**Honesty:** FFS Part B only (not MA); HCPCS≠NDC; lagged annual; capped extract — not a full national dump.

## PECOS / enrollment group rollups

```bash
npm run data:enrollment
# python3 scripts/ingest/enrich_enrollment_groups.py --limit 150 [--offline-sample]
```

Writes `data/processed/enrollment_groups.json` via CMS Public Provider Enrollment (PECOS-adjacent association IDs) + optional NPPES org names. UI: `/accounts`; also shown on prescriber detail when known.

**Honesty:** association ID ≠ legal entity; many NPIs are singletons in PPE.

## Open Payments scoring (opportunity rows)

```bash
npm run data:openpayments          # fetch/cache profiles
npm run data:openpayments:score    # add score/flags/concentration onto cache
```

Scores join onto Prescriber opportunity table + detail drawer (Pro+). Heuristic labels — not compliance findings.
