# PurpleGap

**Medicare Part D biosimilar conversion intelligence** for PBM formulary and Part D plan teams.

PurpleGap (formerly Bioshift) ranks prescribers by brand biologics spend where peers already use more biosimilars, using **real CMS Part D Prescribers (CY2024)** filtered to biosimilar-relevant molecules and joined to **FDA Purple Book** linkages.

> **CMS Part D Prescribers CY2024 (filtered to biosimilar-relevant molecules) + FDA Purple Book — not a full national dump.** Gross Part D costs; beneficiary counts may be CMS-suppressed.

> **Note:** The repo directory remains `/workspace/bioshift` (legacy path). Product name in the UI is **PurpleGap**.

## Who buys this

- PBM formulary / specialty strategy teams  
- Medicare Part D plan pharmacy leadership  
- Account / field teams needing territory NPI packs  
- (Secondary) biosimilar manufacturer market-access analytics partners  

## Monetization modules (in UI)

1. **Opportunity feed** — NPI lists of high brand / low biosimilar prescribers (CSV export)  
2. **Plan–prescribing gap** — demo formulary preferred biosimilar vs actual mix  
3. **Launch alerts** — FDA Purple Book monthly N/R/U changelog for tracked families + biosimilars vs high Part D spend brands  
4. **Territory packs** — state / specialty filtered exports  
5. **Pricing** — illustrative SaaS seats + data feed + custom packs  
6. **Watchlists + weekly digest** — save molecules / states / NPIs; in-app digest preview (email path documented, not sent)  

## Illustrative Opportunity $

```
peer_gap = max(0, peer_biosimilar_share − this_NPI_biosimilar_share)
opportunity_$ = brand_gross_spend × peer_gap
```

- **Peer biosimilar share** = mean of other providers’ biosimilar claim shares in the same **specialty + state** + molecule family when ≥3 other peers exist; otherwise mean of other **family-level** peers.
- **Peer gap (pp)** = that difference shown as percentage points (floored at 0).
- Honesty label in UI/exports: *Illustrative gross Part D opportunity; not net of rebates/DIR.*

Computed at runtime in `src/lib/data.ts` (`computeOpportunities`) from `data/prescribers.json` — no separate CMS rebuild required for this metric. Formula is shown in-product (`OpportunityFormula`).

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts  
- Active data: `data/processed/` (synced to `data/*.json`)  
- Sample archive: `data/sample/`  

## Real vs sample data

| Mode | Command | Active files |
|------|---------|--------------|
| **Real (default)** | `npm run data:ingest` then restart | `data/processed/*` → `data/*.json` from CMS + Purple Book |
| **Sample** | `npm run data:sample` then restart | Restores `data/sample/*` into `data/*.json` |

Provenance: `data/processed/meta.json` (`flag: "REAL CMS PUF"`, `cms_year: 2024`).

Refresh details: [`scripts/ingest/README.md`](scripts/ingest/README.md). Sample restore: [`scripts/seed/README.md`](scripts/seed/README.md).

**Purple Book changelog:** `npm run data:purple` (or `npm run data:purple:changelog`) writes `data/purple_book_changelog.json` from the FDA monthly N/R/U section + optional snapshot diffs under `data/raw/purple_book_snapshots/`. See [`scripts/ingest/README.md`](scripts/ingest/README.md).

**Part D spend / Part B / enrollment / OP scores (Pro+):**

```bash
npm run data:partd-spend      # national Part D spend KPIs → Drugs + Makers
npm run data:partb           # biologic HCPCS Part B NPIs → /partb
npm run data:enrollment      # PECOS-adjacent group rollups → /accounts
npm run data:openpayments && npm run data:openpayments:score
```

See [`scripts/ingest/README.md`](scripts/ingest/README.md).

**NPPES contacts (Pro+):** `npm run data:nppes` enriches top opportunity NPIs into `data/processed/nppes_contacts.json` (public registry — address/phone only, no email). Full refresh: `npm run data:nppes:all`.

## Routes

| Path | Description |
|------|-------------|
| `/` | Overview KPIs + top opportunities |
| `/drugs` | Drug families, biosimilar list, conversion charts |
| `/prescribers` | Search / filter / sort opportunity feed |
| `/geography` | State ranking |
| `/alerts` | Purple Book monthly changelog + launch / conversion alerts (Free: top-3 teaser) |
| `/watchlists` | Saved watchlists (molecules / states / NPIs) + weekly digest preview |
| `/monetize` | Packaging, plan gap, territory packs, pricing |
| `/about` | Pitch, sources, limitations, compliance |
| `/login` | SSO chooser (Clerk) or demo session fallback |
| `/sign-in`, `/sign-up` | Clerk hosted catch-all pages |
| `/pricing` | Feature matrix + Stripe Checkout / Contact sales |
| `/api/export/opportunities` | CSV export (optional `state`, `specialty`, `familyId`) |
| `/api/watchlists` | GET/PUT saved watchlists (demo: file under `data/user_watchlists/`; Clerk: `publicMetadata.watchlists`) |
| `/api/digest` | Weekly digest JSON for session watchlists (no email) |
| `/api/stripe/checkout` | Create Stripe Checkout Session (`pro` \| `enterprise`) |
| `/api/stripe/portal` | Stripe Customer Portal |
| `/api/stripe/webhook` | Sync Stripe subscription → Clerk `publicMetadata.plan` |

## Auth + billing (Clerk SSO + Stripe)

Primary auth is **Clerk** (`@clerk/nextjs`). Subscription state lives on the Clerk user as `publicMetadata.plan` = `free` | `pro` | `enterprise`. Feature gates (`canAccess` / `PlanGate` / export APIs) are unchanged and read that plan.

If `AUTH_MODE=demo` **or** Clerk keys are missing, the app falls back to the existing `purplegap_session` cookie so local demo still works.

| Plan | Access | How you get it |
|------|--------|----------------|
| **Free** | Overview (top 3 opportunities) + Purple Book alerts teaser + About + **1 watchlist (5 items)**; watermark; other modules locked | Default for new Clerk users |
| **Pro** ($6,000/yr) | Drugs, prescribers, geography, alerts, watchlists (10 lists · 50 items), digest, limited CSV export; limited territory packs | Stripe Checkout (`STRIPE_PRICE_PRO_YEARLY`) |
| **Enterprise** (custom) | Everything in Pro + plan–prescribing gap, API/multi-seat stubs, priority alerts, unlimited list exports | Stripe Checkout if `STRIPE_PRICE_ENTERPRISE_YEARLY` is set, **or** Contact sales + manual Clerk metadata grant |

### Create a Clerk app + SSO

1. Create an application at [https://dashboard.clerk.com](https://dashboard.clerk.com).
2. **Configure → SSO connections**: enable **Google** and **Microsoft**.
3. **Configure → Paths** (or env):
   - Sign-in URL `/sign-in`
   - Sign-up URL `/sign-up`
   - After sign-in / sign-up `/`
4. Copy the **Publishable key** and **Secret key** into `.env.local` (see env table below).
5. Add `http://localhost:3000` (and the production origin) to allowed origins / redirect URLs.

### Create Stripe products + webhook

1. Create a Product **PurpleGap Pro** with a **yearly** recurring Price of **$6,000** (`600000` cents). Copy the Price ID (`price_...`) into `STRIPE_PRICE_PRO_YEARLY`.
2. Optional: create **PurpleGap Enterprise** yearly price → `STRIPE_PRICE_ENTERPRISE_YEARLY`. If omitted, Pricing shows **Contact sales** instead of checkout.
3. Developers → Webhooks → Add endpoint: `{NEXT_PUBLIC_APP_URL}/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`
4. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the CLI webhook secret.

Checkout is `subscription` mode. Sessions send `client_reference_id` + `metadata.clerkUserId`. The webhook writes:

- `publicMetadata.plan` = mapped price (`pro` / `enterprise`) or `free` on cancel/delete
- `privateMetadata.stripeCustomerId` = Stripe customer id

### Env vars (copy `.env.example` → `.env.local`)

```
AUTH_MODE=clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_ENTERPRISE_YEARLY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit secrets. `.env` / `.env.local` are gitignored.

### Grant Enterprise manually

Clerk Dashboard → **Users** → select the user → **Public metadata**:

```json
{ "plan": "enterprise" }
```

Or from the repo (uses the Clerk Backend API, merges metadata):

```bash
CLERK_SECRET_KEY=sk_... npm run billing:grant-enterprise -- user_2abc
# or
CLERK_SECRET_KEY=sk_... node scripts/grant-enterprise.mjs analyst@pbm.example
```

### How to demo without keys

1. Leave Clerk/Stripe vars empty (or set `AUTH_MODE=demo`)
2. Open `/login` — **Continue with demo session** / Continue as guest
3. Pick Free / Pro / Enterprise; header shows the plan badge
4. `/pricing` still uses the same feature matrix (`src/lib/plans.ts`)

Public without session: `/login`, `/sign-in`, `/sign-up`, `/pricing`, `/about`, `/api/stripe/webhook`, `/api/stripe/config`. Other app routes redirect to `/login`.


## Watchlists + weekly digest (sticky feature #3)

Buyers can pin **molecule families**, **states**, and **NPIs**, then see matching illustrative Opportunity $ (same `computeOpportunities` / peer-gap formula) and an in-app **weekly digest** preview (top opp $, Purple Book alerts on watched families, peer-gap highlights).

### Persistence

| Mode | Client | Server |
|------|--------|--------|
| **Demo** (`AUTH_MODE=demo` or missing Clerk keys) | `localStorage` key `purplegap_watchlists` | File JSON under `data/user_watchlists/<hash>.json` via `PUT /api/watchlists` |
| **Clerk** | Same localStorage cache + sync | Clerk `publicMetadata.watchlists` |

`WatchlistProvider` is the abstraction: UI always reads/writes through it; demo vs Clerk backends swap in `/api/watchlists`.

### Plan limits (`WATCHLIST_LIMITS` in `src/lib/watchlists/limits.ts`)

| Plan | Lists | Items / list |
|------|------:|-------------:|
| Free | 1 | 5 |
| Pro | 10 | 50 |
| Enterprise | 25 | 200 |

### Try it

1. Demo login → **Watchlists** in the nav (or `/watchlists`)
2. Create a list → add a family/state/NPI from the form **or** open a drawer on Drugs / Geography / Prescribers → **Add to watchlist**
3. Open the **Digest** tab for the in-app preview; **Export JSON** calls `POST /api/digest`
4. Optional CLI (server must be running + session cookie):

```bash
DIGEST_COOKIE='purplegap_session=...' npm run digest:preview
# or: DIGEST_OUT=/tmp/digest.json npm run digest:preview
```

### Email later (not implemented)

Do **not** send email from this MVP. Cron `npm run digest:preview` (or `GET /api/digest`) and hand the JSON to SendGrid/Resend/etc. See `emailPathNote` on the digest payload and `scripts/digest-preview.mjs`.

## How to run

```bash
cd /workspace/bioshift
cp .env.example .env.local   # fill Clerk + Stripe for SSO/billing, or leave blank for demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build (works with empty Clerk keys — demo fallback):

```bash
npm run build
npm start
```

After regenerating data, restart (`npm run build && npm start` or restart `npm run dev`).

## Data sources

- CMS Part D Prescribers: https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers  
- FDA Purple Book downloads: https://purplebooksearch.fda.gov/downloads  

## Limitations

- **Gross cost** only (not net of rebates / DIR)  
- **Filtered extract** — biosimilar-relevant molecules; may cap top NPIs/family for demo size  
- **No NDC** in Part D provider-drug PUF — name/family level matching  
- **Part B gap** — many biologics are buy-and-bill  
- Formulary gap uses **demo** plan preferences, not redistributed CMS formulary PUF  

## License / affiliation

Demo MVP for product illustration. Not affiliated with CMS or FDA. Not medical advice.

## Open Payments overlay (sticky feature #4)

Pro+ overlay on the **Prescriber detail** drawer: total CMS Open Payments (general / research / ownership), top paying companies, and honesty that figures are public Sunshine Act data with lagged program years.

### Refresh cache

```bash
# Top opportunity NPIs (default 50)
npm run data:openpayments

# Larger seed
python3 scripts/ingest/enrich_open_payments.py --limit 200 --program-year 2024

# Every NPI in the opportunity set (slow; polite rate limit)
npm run data:openpayments:all
```

Writes `data/processed/open_payments.json`. Uses the CMS Open Payments **Datastore Query API** filtered to NPIs already in `data/prescribers.json` — not a full national CSV download.

**Limitations:** program-year lag; opportunity-set NPIs only; company rollups are sums of returned rows; Free plan sees a locked teaser with upgrade CTA.

## Maker competitive share packs (sticky feature #5)

Route: `/makers` (also linked from Monetize). For each drug family: brand vs biosimilar Part D claims share, top brand-heavy NPIs, illustrative opportunity $, and state concentration — framed for **biosimilar manufacturers / BD** (ex-US entering US). Gross Part D honesty labels throughout.

```bash
# Try in demo: login as Pro or Enterprise → Makers in nav
# CSV:
#   /api/export/maker-share?level=family
#   /api/export/maker-share?level=state&familyId=adalimumab
#   /api/export/maker-share?level=npi&familyId=adalimumab          # Pro limited
#   /api/export/maker-share?level=npi&familyId=adalimumab&full=1   # Enterprise
```

## Enterprise API + CRM export (sticky feature #6)

### JSON API

```bash
# Set in .env.local (never commit):
# PURPLEGAP_API_KEY=pg_live_demo_enterprise_key

curl -s "http://localhost:3000/api/v1/opportunities?state=TX&limit=10" \
  -H "Authorization: Bearer $PURPLEGAP_API_KEY"

# Filters: state, familyId, specialty, minOpportunity, limit, offset
# Auth: Bearer / X-API-Key matching PURPLEGAP_API_KEY, OR Enterprise session cookie.
# Free / Pro → 403 with upgrade message.
```

### CRM CSV

From **Monetize** → “Download CRM CSV” (or `/api/export/crm`):

Columns: `npi, name, state, specialty, family, reference_brand, opportunity_usd, peer_gap_pp, phone, address`

Pro: row-capped. Enterprise: `?full=1` unlimited. Phone/address from NPPES when `provider_contacts` is allowed.


## List UX (sort · filter · click → detail)

Major list UIs share the same interaction pattern:

| Surface | Sort | Filter | Click → detail |
|---------|------|--------|----------------|
| Overview top opportunities | Column headers | Search + state | `PrescriberDetailPanel` |
| Prescribers | Column headers | Search + state/specialty/family | `PrescriberDetailPanel` |
| Drugs / families | Sort-by select | Search + therapeutic area | `FamilyDetailPanel` |
| Geography / states | Column headers | State search | `StateDetailPanel` |
| Alerts / Purple Book | — (chrono cards) | Search + family + N/R/U (Pro+) | `FamilyDetailPanel` |
| Watchlists matches | — | Search matches | `PrescriberDetailPanel` |
| Makers NPI / state tables | Column headers | Search | Prescriber / State / Family panels |
| Part B (`/partb`) | Column headers | Search + family + state | `PartBDetailPanel` |
| Accounts (`/accounts`) | Column headers | Search + multi-NPI | `AccountDetailPanel` → member → Prescriber |
| Monetize plan-gap table | Column headers | Search | `FamilyDetailPanel` (Enterprise-gated) |

Shared primitives (prefer these over copy-paste):

- `src/hooks/useSortableTable.ts` — asc/desc toggle + stable sort
- `src/components/list/SortableTh.tsx` — clickable header with aria-sort
- `src/components/list/FilterBar.tsx` — search/select layout
- `src/components/DetailDrawer.tsx` — Escape-to-close side panel shell

Free/Pro/Enterprise gates and CMS sticky features are unchanged. Filter state lives in component state (URL query optional).

