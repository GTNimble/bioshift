# PurpleGap outreach contact lists

CRM-ready CSVs for PurpleGap freemium / Pro demo outreach. Public sources and proper enrichment only — no fabricated people or emails. Individual doctor NPIs are not email-blast targets.

## List 1 — US Priority 1 (highest WTP)

**File:** `purplegap-us-priority1-contacts.csv`

**Audience:** Part D / MA-PD plan sponsors, national & regional PBMs, specialty pharmacy leads, market-access / rebate strategy (PBM side).

**Pitch:** Freemium Medicare Part D biosimilar conversion map — opportunity NPIs, geography gaps, launch alerts for formulary teams under IRA risk.

**Demo CTA:** Watch short PurpleGap demo / book Pro walkthrough

### Counts

| Metric | Count |
| --- | ---: |
| **Total rows** | **35** |
| **Priority A** | **21** |
| Priority B | 12 |
| Priority C | 2 |
| Named contacts (email Unknown) | 8 |
| Org-level rows (person Unknown) | 27 |

### By segment

| Segment | Rows |
| --- | ---: |
| National PBM | 11 |
| MA-PD Parent | 11 |
| Part D Sponsor | 7 |
| Specialty Pharmacy | 4 |
| Regional PBM | 2 |

### Data rules applied

- Exact CSV headers: Company, Segment, HQ_region, Likely_titles, Person_name, Email, LinkedIn_URL, Why_they_fit, Suggested_angle, Demo_CTA, Source_URL, Priority
- Person_name / Email = `Unknown` when not publicly confirmed (never invented)
- Prefer org-level rows with likely titles + LinkedIn company URL + cited Source_URL
- Named rows only when a public LinkedIn (or equivalent) title match was found; emails still Unknown
- Sources include CMS Part D directories, plan formulary pages, PBM/specialty sites, and industry analyses (e.g. Oliver Wyman 2026 Part D formularies)

## List 2 — Ex-US Priority 2 (India/China and similar biosimilar/generic makers with US / Purple Book path)

**File:** `purplegap-exus-priority2-contacts.csv`  
**Generated:** 2026-09-13  
**Product angle:** PurpleGap — freemium US Medicare Part D biosimilar conversion intelligence (CMS Part D Prescribers + FDA Purple Book). Pitch: “US Medicare Part D conversion map for biosimilar exporters — who still scripts the reference brand.”

### Counts
| Metric | Count |
|--------|------:|
| Total rows | 32 |
| Unique companies | 20 |
| Priority A | 19 |
| Priority B | 11 |
| Priority C | 2 |
| Named people (public) | 3 |
| Invented emails | 0 (must stay 0) |

### By segment
| Segment | Rows |
|---------|-----:|
| India Biosimilar Mfr | 8 |
| US Commercial Partner | 8 |
| EU Biosimilar Mfr | 7 |
| Korea Biosimilar Mfr | 5 |
| China Biosimilar Mfr (US path) | 4 |

### Inclusion rules applied
- Verified FDA Purple Book 351(k) applicants / US commercial partners (local Aug 2026 Purple Book extract + public FDA/company news).
- Prefer Part D–relevant assets (insulin, adalimumab, ustekinumab, omalizumab, denosumab/Prolia path). Part B–only infused oncology/ophthalmology not used as the hero story (still may appear as secondary portfolio notes).
- Excluded: pure domestic China/India pharmacy chains; makers with no US/Purple Book path.
- Public sources only. Person emails = Unknown unless publicly found (none invented). Prefer company LinkedIn + likely titles when no public person named.

### Companies in List 2
- Accord BioPharma (Intas)
- Alvotech
- Amneal Pharmaceuticals
- Bio-Thera Solutions
- Biocon Biologics
- Celltrion USA (Celltrion Inc.)
- Coherus Oncology (legacy biosimilar partners)
- Dr. Reddy's Laboratories
- Formycon AG
- Fresenius Kabi USA
- Harrow
- Hikma Pharmaceuticals USA
- Lupin
- Organon
- Samsung Bioepis
- Sandoz (Novartis)
- Shanghai Henlius Biotech (Fosun)
- Sunshine Lake Pharma (Langlara / Lanexa path)
- Teva Pharmaceuticals
- Zydus Lifesciences

### Source backbone
- FDA Purple Book Search: https://purplebooksearch.fda.gov/
- Local extract: `data/raw/purple_book.csv` (August 2026 monthly report)
- Company press / FDA approval letters cited per row in `Source_URL`

