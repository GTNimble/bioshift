import { existsSync, readFileSync } from "fs";
import path from "path";
import { computeOpportunities } from "@/lib/data";
import type {
  EnrollmentFile,
  EnrollmentGroup,
  EnrollmentLinkSummary,
} from "@/lib/enrollmentTypes";
export type {
  EnrollmentNpiMember,
  EnrollmentGroup,
  EnrollmentFile,
  EnrollmentLinkSummary,
} from "@/lib/enrollmentTypes";
export { ENROLLMENT_HONESTY, enrollmentSourceLabel } from "@/lib/enrollmentTypes";

const REL = path.join("data", "processed", "enrollment_groups.json");

function empty(): EnrollmentFile {
  return {
    source: "https://data.cms.gov/",
    note: "No enrollment cache — run npm run data:enrollment",
    honesty: "PPE association ≠ legal entity. Illustrative group rollups.",
    updatedAt: new Date().toISOString(),
    npiEnrollment: {},
    npiToGroupId: {},
    groups: {},
    groupList: [],
    groupCount: 0,
    npiCount: 0,
  };
}

export function loadEnrollment(): EnrollmentFile {
  const p = path.join(process.cwd(), REL);
  if (!existsSync(p)) return empty();
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as EnrollmentFile;
    if (!raw.groups) return empty();
    return raw;
  } catch {
    return empty();
  }
}

function liveOppByNpi(): Map<string, number> {
  const byNpi = new Map<string, number>();
  for (const o of computeOpportunities()) {
    byNpi.set(o.npi, (byNpi.get(o.npi) || 0) + o.opportunityScore);
  }
  return byNpi;
}

function roundUsd(n: number): number {
  return Math.round(n * 100) / 100;
}

function groupLiveOpportunity(g: EnrollmentGroup, byNpi: Map<string, number>): number {
  return roundUsd(g.npis.reduce((s, m) => s + (byNpi.get(m.npi) || 0), 0));
}

/** Attach live peer-gap Opp $ to each member and roll up to the group. */
function enrichGroupWithLive(g: EnrollmentGroup, byNpi: Map<string, number>): EnrollmentGroup {
  const npis = g.npis.map((m) => ({
    ...m,
    liveOpportunityUsd: roundUsd(byNpi.get(m.npi) || 0),
  }));
  const liveOpportunityUsd = roundUsd(
    npis.reduce((s, m) => s + (m.liveOpportunityUsd || 0), 0)
  );
  return { ...g, npis, liveOpportunityUsd };
}

export function getEnrollmentGroupsLive(): EnrollmentGroup[] {
  const file = loadEnrollment();
  const byNpi = liveOppByNpi();
  return file.groupList.map((g) => enrichGroupWithLive(g, byNpi));
}

export function getGroupForNpi(npi: string): EnrollmentGroup | null {
  const file = loadEnrollment();
  const gid = file.npiToGroupId[npi];
  if (!gid) return null;
  const g = file.groups[gid];
  if (!g) return null;
  return enrichGroupWithLive(g, liveOppByNpi());
}

/**
 * Bulk NPI → account/PECOS summary for list views (no member arrays, one file load).
 * Prefer this over getGroupForNpi in tables to avoid N+1.
 */
export function getEnrollmentLinksByNpi(): Record<string, EnrollmentLinkSummary> {
  const file = loadEnrollment();
  const byNpi = liveOppByNpi();
  const liveByGroup = new Map<string, number>();
  for (const g of file.groupList) {
    liveByGroup.set(g.groupId, groupLiveOpportunity(g, byNpi));
  }
  const out: Record<string, EnrollmentLinkSummary> = {};
  for (const [npi, gid] of Object.entries(file.npiToGroupId)) {
    const g = file.groups[gid];
    if (!g) continue;
    out[npi] = {
      groupId: g.groupId,
      displayName: g.displayName,
      source: g.source,
      pecosAssocControlId: g.pecosAssocControlId,
      state: g.state,
      npiCount: g.npiCount,
      opportunityUsd: liveByGroup.get(g.groupId) ?? g.illustrativeOpportunityUsd,
    };
  }
  return out;
}

/** Coverage helper for diagnostics / UI banners. */
export function getEnrollmentCoverage(opportunityNpis?: Iterable<string>): {
  linkedNpis: number;
  groupCount: number;
  opportunityNpis: number;
  linkedOpportunityNpis: number;
} {
  const file = loadEnrollment();
  const linked = new Set(Object.keys(file.npiToGroupId));
  let opportunityCount = 0;
  let linkedOpp = 0;
  if (opportunityNpis) {
    for (const n of opportunityNpis) {
      opportunityCount += 1;
      if (linked.has(n)) linkedOpp += 1;
    }
  }
  return {
    linkedNpis: linked.size,
    groupCount: file.groupCount || file.groupList.length,
    opportunityNpis: opportunityCount,
    linkedOpportunityNpis: linkedOpp,
  };
}
