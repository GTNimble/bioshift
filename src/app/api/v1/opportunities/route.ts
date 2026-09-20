import { NextRequest, NextResponse } from "next/server";
import { computeOpportunities } from "@/lib/data";
import { resolveEnterpriseApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * Enterprise opportunities JSON API.
 *
 * Auth: Authorization: Bearer $PURPLEGAP_API_KEY  OR  X-API-Key  OR  Enterprise session.
 * Query: state, familyId, specialty, minOpportunity, limit (default 100, max 1000), offset.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveEnterpriseApiAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const familyId = searchParams.get("familyId");
  const specialty = searchParams.get("specialty");
  const minOpportunity = Number(searchParams.get("minOpportunity") || "0");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "100"), 1), 1000);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);

  let opps = computeOpportunities();
  if (state) opps = opps.filter((o) => o.state === state);
  if (familyId) opps = opps.filter((o) => o.familyId === familyId);
  if (specialty) opps = opps.filter((o) => o.specialty === specialty);
  if (minOpportunity > 0) opps = opps.filter((o) => o.opportunityScore >= minOpportunity);

  const total = opps.length;
  const page = opps.slice(offset, offset + limit).map((o) => ({
    npi: o.npi,
    providerName: o.providerName,
    state: o.state,
    specialty: o.specialty,
    familyId: o.familyId,
    ingredient: o.ingredient,
    referenceBrand: o.referenceBrand,
    brandCost: Math.round(o.brandCost),
    brandClaims: o.brandClaims,
    biosimilarClaims: o.biosimilarClaims,
    biosimilarShare: Number(o.biosimilarShare.toFixed(4)),
    peerBiosimilarShare: Number(o.peerBiosimilarShare.toFixed(4)),
    peerScope: o.peerScope,
    peerGapPp: Number((o.peerGapPp * 100).toFixed(2)),
    opportunityUsd: Math.round(o.opportunityScore),
    brandBenes: o.brandBenes,
  }));

  return NextResponse.json({
    data: page,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
    meta: {
      honesty: "Illustrative gross Part D opportunity; not net of rebates/DIR.",
      authVia: auth.via,
      source: "CMS Part D Prescribers CY2024 (biosimilar-relevant filter) + peer-gap model",
    },
  });
}
