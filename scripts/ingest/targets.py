"""Shared target molecule stems and therapeutic-area hints for Bioshift ingest."""

from __future__ import annotations

# Ordered longest-first so pegfilgrastim wins over filgrastim, etc.
TARGET_STEMS: list[tuple[str, str]] = [
    ("pegfilgrastim", "pegfilgrastim"),
    ("tbo-filgrastim", "filgrastim"),
    ("filgrastim", "filgrastim"),
    ("adalimumab", "adalimumab"),
    ("ustekinumab", "ustekinumab"),
    ("etanercept", "etanercept"),
    ("ranibizumab", "ranibizumab"),
    ("denosumab", "denosumab"),
    ("infliximab", "infliximab"),
    ("rituximab", "rituximab"),
    ("trastuzumab", "trastuzumab"),
    ("bevacizumab", "bevacizumab"),
    ("insulin glargine", "insulin_glargine"),
    ("insulin aspart", "insulin_aspart"),
    ("insulin lispro", "insulin_lispro"),
    ("darbepoetin", "darbepoetin"),
    ("epoetin", "epoetin"),
]

THERAPEUTIC_AREA: dict[str, str] = {
    "adalimumab": "Rheumatology / Dermatology / GI",
    "ustekinumab": "Dermatology / GI / Rheumatology",
    "pegfilgrastim": "Hematology / Oncology supportive",
    "filgrastim": "Hematology / Oncology supportive",
    "etanercept": "Rheumatology / Dermatology",
    "insulin_glargine": "Endocrinology / Diabetes",
    "insulin_aspart": "Endocrinology / Diabetes",
    "insulin_lispro": "Endocrinology / Diabetes",
    "ranibizumab": "Ophthalmology",
    "denosumab": "Endocrinology / Oncology bone",
    "infliximab": "GI / Rheumatology",
    "rituximab": "Oncology / Rheumatology",
    "trastuzumab": "Oncology",
    "bevacizumab": "Oncology / Ophthalmology",
    "epoetin": "Nephrology / Hematology",
    "darbepoetin": "Nephrology / Hematology",
}

# Exact CMS Gnrc_Name values known to match targets (used by API path).
# Streaming also catches suffixes like Adalimumab-Bwwd.
KNOWN_GNRC_NAMES: list[str] = [
    "Adalimumab",
    "Ustekinumab",
    "Pegfilgrastim",
    "Filgrastim",
    "Etanercept",
    "Ranibizumab",
    "Denosumab",
    "Infliximab",
    "Rituximab",
    "Trastuzumab",
    "Bevacizumab",
    "Insulin Aspart",
    "Insulin Aspart (Niacinamide)",
    "Insulin Lispro",
    "Insulin Lispro-Aabc",
    "Insulin Glargine,hum.Rec.Anlog",
    "Insulin Glargine-Yfgn",
    "Insulin Glargine-Aglr",
    "Epoetin Alfa",
    "Epoetin Alfa-Epbx",
    "Darbepoetin Alfa In Polysorbat",
    "Tbo-Filgrastim",
]

CMS_CSV_URL = (
    "https://data.cms.gov/sites/default/files/2026-05/"
    "0ae165f4-eb44-495d-8cac-67f4571b6b83/MUP_DPR_RY26_P04_V10_DY24_NPIBN.csv"
)
CMS_API_URL = (
    "https://data.cms.gov/data-api/v1/dataset/"
    "9552739e-3d05-4c1b-8eff-ecabf391e2e5/data"
)
CMS_YEAR = 2024
PURPLE_BOOK_PAGE = "https://purplebooksearch.fda.gov/downloads"
PURPLE_BOOK_CSV_DEFAULT = (
    "https://www.accessdata.fda.gov/drugsatfda_docs/PurpleBook/2026/"
    "purplebook-search-August-data-download.csv"
)


def normalize_gnrc(name: str) -> str:
    return (name or "").strip().lower().replace(",", " ")


def assign_family(gnrc_name: str) -> str | None:
    """Map CMS Gnrc_Name to familyId, or None if not a target / excluded combo."""
    g = normalize_gnrc(gnrc_name)
    if not g:
        return None
    # Exclude antibody-drug conjugates and fixed-ratio combos with other actives
    if g.startswith("ado-"):
        return None
    if "/" in g and "insulin aspart" not in g and "insulin lispro" not in g:
        # e.g. Insulin Glargine/Lixisenatide
        return None
    for stem, family_id in TARGET_STEMS:
        if stem in g:
            return family_id
    return None
