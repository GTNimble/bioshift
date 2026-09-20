export type PlanId = "free" | "pro" | "enterprise";

export type Session = {
  email: string;
  plan: PlanId;
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const PLAN_BADGE_CLASSES: Record<PlanId, string> = {
  free: "bg-slate-100 text-slate-700 ring-slate-200",
  pro: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  enterprise: "bg-violet-50 text-violet-800 ring-violet-200",
};

/** Routes that require any authenticated session */
export const PROTECTED_PREFIXES = [
  "/",
  "/drugs",
  "/prescribers",
  "/partb",
  "/accounts",
  "/geography",
  "/alerts",
  "/watchlists",
  "/monetize",
  "/makers",
  "/api/export",
  "/api/watchlists",
  "/api/digest",
] as const;

/** Public routes (no session required) */
export const PUBLIC_PATHS = ["/login", "/sign-in", "/sign-up", "/pricing", "/about"] as const;

export const SALES_EMAIL = "sales@purplegap.demo";

/** Feature keys used for gating */
export type FeatureKey =
  | "overview"
  | "drugs"
  | "prescribers"
  | "geography"
  | "alerts"
  | "alerts_full"
  | "monetize"
  | "csv_export"
  | "territory_packs"
  | "plan_gap"
  | "api_feed"
  | "multi_seat"
  | "priority_alerts"
  | "full_monetize_exports"
  | "list_exports"
  | "provider_contacts"
  | "watchlists"
  | "watchlists_digest"
  | "open_payments"
  | "maker_share_pack";

const FEATURE_MATRIX: Record<FeatureKey, Record<PlanId, boolean>> = {
  overview: { free: true, pro: true, enterprise: true },
  drugs: { free: false, pro: true, enterprise: true },
  prescribers: { free: false, pro: true, enterprise: true },
  geography: { free: false, pro: true, enterprise: true },
  /** Page accessible; Free sees teaser only (see AlertsClient) */
  alerts: { free: true, pro: true, enterprise: true },
  /** Full Purple Book changelog + launch/conversion alert list */
  alerts_full: { free: false, pro: true, enterprise: true },
  monetize: { free: false, pro: true, enterprise: true },
  /** Pro+: limited opportunity CSV (filtered feed) */
  csv_export: { free: false, pro: true, enterprise: true },
  territory_packs: { free: false, pro: true, enterprise: true },
  plan_gap: { free: false, pro: false, enterprise: true },
  api_feed: { free: false, pro: false, enterprise: true },
  multi_seat: { free: false, pro: false, enterprise: true },
  priority_alerts: { free: false, pro: false, enterprise: true },
  full_monetize_exports: { free: false, pro: false, enterprise: true },
  /** Enterprise: unlimited list exports (opportunity, territory, family, NPI, state) */
  list_exports: { free: false, pro: false, enterprise: true },
  /** Pro+: NPPES practice address/phone on provider detail + export columns */
  provider_contacts: { free: false, pro: true, enterprise: true },
  /** Saved watchlists (Free: 1 list / 5 items; Pro+: higher caps — see WATCHLIST_LIMITS) */
  watchlists: { free: true, pro: true, enterprise: true },
  /** In-app weekly digest preview + /api/digest JSON (email not sent) */
  watchlists_digest: { free: true, pro: true, enterprise: true },
  /** Pro+: CMS Open Payments overlay on prescriber detail */
  open_payments: { free: false, pro: true, enterprise: true },
  /** Pro+: maker-facing competitive share packs (brand vs biosimilar) */
  maker_share_pack: { free: false, pro: true, enterprise: true },
};

export function canAccess(plan: PlanId, feature: FeatureKey): boolean {
  return FEATURE_MATRIX[feature][plan];
}

/** Coerce unknown metadata / cookie values to a valid plan (default free). */
export function parsePlanId(value: unknown): PlanId {
  if (value === "pro" || value === "enterprise" || value === "free") return value;
  return "free";
}

export type PricingFeatureRow = {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
};

export const PRICING_FEATURES: PricingFeatureRow[] = [
  { label: "Overview KPIs", free: true, pro: true, enterprise: true },
  { label: "About & methodology", free: true, pro: true, enterprise: true },
  { label: "Top opportunities sample", free: "Top 3", pro: "Full feed", enterprise: "Full feed" },
  { label: "Drugs / families explorer", free: false, pro: true, enterprise: true },
  { label: "Prescriber opportunity feed", free: false, pro: true, enterprise: true },
  { label: "Geography / state ranking", free: false, pro: true, enterprise: true },
  { label: "Purple Book monthly alerts", free: "Top 3 teaser", pro: true, enterprise: "Priority" },
  { label: "CSV export (opportunity feed)", free: false, pro: "Limited", enterprise: true },
  {
    label: "Unlimited list exports (opportunity, territory, family, NPI)",
    free: false,
    pro: false,
    enterprise: true,
  },
  { label: "Territory packs", free: false, pro: "Limited", enterprise: "Unlimited" },
  { label: "Plan–prescribing gap module", free: false, pro: false, enterprise: true },
  { label: "Full monetize exports", free: false, pro: false, enterprise: true },
  { label: "Enterprise API (/api/v1/opportunities)", free: false, pro: false, enterprise: true },
  { label: "Multi-seat management stub", free: false, pro: false, enterprise: true },
  { label: "Provider contact enrichment (NPPES address/phone)", free: false, pro: true, enterprise: true },
  { label: "Part B biologic practitioners (buy-and-bill PUF)" , free: false, pro: true, enterprise: true },
  { label: "Accounts / enrollment group rollups", free: false, pro: true, enterprise: true },
  { label: "Open Payments overlay + score on opportunity rows", free: false, pro: true, enterprise: true },
  { label: "Open Payments overlay (prescriber detail)", free: false, pro: true, enterprise: true },
  {
    label: "Maker competitive share packs",
    free: false,
    pro: "UI + limited CSV",
    enterprise: "Full CSV",
  },
  { label: "CRM CSV (NPI + phone + address)", free: false, pro: "Limited", enterprise: true },
  {
    label: "Saved watchlists (molecules / states / NPIs)",
    free: "1 list · 5 items",
    pro: "10 lists · 50 items",
    enterprise: "25 lists · 200 items",
  },
  { label: "Weekly digest preview (in-app / JSON)", free: true, pro: true, enterprise: true },
];

export const PLAN_CARDS = [
  {
    id: "free" as PlanId,
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Overview sample, Purple Book alerts teaser, and 1 watchlist — ideal for evaluating fit.",
    cta: "Start free",
    highlight: false,
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    price: "$6,000",
    period: "/yr",
    blurb: "Full dashboard for formulary analysts: drugs, prescribers, geography, alerts, watchlists + digest, NPPES contacts, Open Payments overlay, maker share packs, limited CSV export.",
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "enterprise" as PlanId,
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    blurb:
      "Plan–prescribing gap, unlimited list/CRM exports, maker share packs, multi-seat, live /api/v1 opportunities feed, priority alerts.",
    cta: "Contact sales",
    highlight: false,
  },
] as const;

export const SESSION_COOKIE = "purplegap_session";
export const SESSION_STORAGE_KEY = "purplegap_session";
export const FREE_SAMPLE_LIMIT = 3;
/** Pro limited opportunity CSV row cap (Enterprise unlimited) */
export const PRO_EXPORT_ROW_LIMIT = 500;
