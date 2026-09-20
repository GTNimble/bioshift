#!/usr/bin/env node
/**
 * Grant Enterprise by setting Clerk publicMetadata.plan = "enterprise".
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_test_... node scripts/grant-enterprise.mjs user_2abc
 *   CLERK_SECRET_KEY=sk_test_... node scripts/grant-enterprise.mjs analyst@pbm.example
 *
 * Dashboard equivalent:
 *   Clerk → Users → select user → Public metadata → { "plan": "enterprise" }
 */
const key = process.env.CLERK_SECRET_KEY;
const target = process.argv[2];

if (!key || !target) {
  console.error("Usage: CLERK_SECRET_KEY=sk_... node scripts/grant-enterprise.mjs <userId|email>");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function resolveUserId(input) {
  if (input.startsWith("user_")) return input;
  const url = new URL("https://api.clerk.com/v1/users");
  url.searchParams.set("email_address", input);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Lookup failed (${res.status}): ${await res.text()}`);
  }
  const users = await res.json();
  const list = Array.isArray(users) ? users : users.data;
  if (!list?.length) throw new Error(`No Clerk user for ${input}`);
  return list[0].id;
}

const userId = await resolveUserId(target);
const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ public_metadata: { plan: "enterprise" } }),
});
if (!res.ok) {
  console.error(`Grant failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}
console.log(`Granted enterprise to ${userId} (${target}).`);
