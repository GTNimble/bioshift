# Sample seed data

Archived CMS-shaped demo JSON lives in `data/sample/`.

## Restore sample as active data

```bash
npm run data:sample
# or: python3 scripts/seed/load_sample.py
```

Then restart the Next.js server (`npm run dev` / `npm start`).

## Re-activate real CMS + Purple Book

```bash
npm run data:real
# or: python3 scripts/ingest/build_processed.py
```

(Requires prior `npm run data:ingest` so `data/raw/` artifacts exist.)
