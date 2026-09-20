#!/usr/bin/env node
/**
 * Routine-friendly weekly digest export (JSON only — does NOT send email).
 *
 * Prerequisites: `npm run dev` or `npm start` with a demo session cookie, OR Clerk auth.
 *
 * Usage:
 *   npm run digest:preview
 *   DIGEST_URL=http://localhost:3000/api/digest npm run digest:preview
 *   DIGEST_COOKIE='purplegap_session=...' npm run digest:preview
 *
 * Cron example (document only):
 *   0 9 * * 1 cd /path/to/bioshift && DIGEST_COOKIE=... npm run digest:preview > /tmp/digest.json
 *   # then pipe /tmp/digest.json to your ESP — do not send PHI
 */

import { writeFileSync } from "fs";

const base = (process.env.DIGEST_URL || "http://localhost:3000/api/digest").replace(/\/$/, "");
const cookie = process.env.DIGEST_COOKIE || "";
const out = process.env.DIGEST_OUT || "";

const headers = { Accept: "application/json" };
if (cookie) headers.Cookie = cookie;

console.error(`Fetching ${base} …`);

let res;
try {
  res = await fetch(base, { headers });
} catch (e) {
  console.error("Fetch failed — is the Next server running?", e.message);
  console.error("Start with: npm run dev");
  console.error("Demo auth: open /login, continue as guest, then copy purplegap_session cookie into DIGEST_COOKIE.");
  process.exit(1);
}

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Response was not JSON:", text.slice(0, 200));
  process.exit(1);
}

const pretty = JSON.stringify(json, null, 2);
if (out) {
  writeFileSync(out, pretty);
  console.error(`Wrote ${out}`);
} else {
  console.log(pretty);
}

console.error("\nEmail path: hand this JSON to SendGrid/Resend/etc. PurpleGap does not send email in MVP.");
if (json.emailPathNote) console.error(json.emailPathNote);
