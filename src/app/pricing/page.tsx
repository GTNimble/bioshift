"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard, Minus, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { EnterpriseDemoModal } from "@/components/EnterpriseDemoModal";
import { PLAN_CARDS, PRICING_FEATURES, SALES_EMAIL, type PlanId } from "@/lib/plans";
import { Suspense } from "react";

type BillingConfig = {
  authMode: "clerk" | "demo";
  clerkEnabled: boolean;
  stripeEnabled: boolean;
  proCheckout: boolean;
  enterpriseCheckout: boolean;
};

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-slate-800">{value}</span>;
  }
  if (value) {
    return <Check className="mx-auto h-5 w-5 text-emerald-600" aria-label="Included" />;
  }
  return <Minus className="mx-auto h-5 w-5 text-slate-300" aria-label="Not included" />;
}

function PricingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, login, setPlan, mode } = useAuth();
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [busy, setBusy] = useState<PlanId | "portal" | null>(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<BillingConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stripe/config")
      .then((r) => r.json())
      .then((data: BillingConfig) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({
            authMode: mode,
            clerkEnabled: mode === "clerk",
            stripeEnabled: false,
            proCheckout: false,
            enterpriseCheckout: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const checkoutStatus = searchParams.get("checkout");
  const stripeLive = Boolean(config?.stripeEnabled && mode === "clerk");

  async function startCheckout(tier: "pro" | "enterprise") {
    setError("");
    if (!session) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (tier === "enterprise" && !config?.enterpriseCheckout) {
      setEnterpriseOpen(true);
      return;
    }
    setBusy(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: tier }),
      });
      const raw = await res.text();
      let data: {
        url?: string;
        error?: string;
        message?: string;
        priceIdPrefix?: string;
        keyPrefix?: string;
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setError(
          `Checkout failed (HTTP ${res.status}). Server returned non-JSON: ${raw.slice(0, 280) || "(empty body)"}`
        );
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error === "contact_sales") {
        setEnterpriseOpen(true);
        return;
      }
      if (data.error === "Unauthorized" || data.error === "clerk_required" || data.error === "clerk_auth_failed") {
        router.push(`/sign-in?redirect_url=${encodeURIComponent("/pricing")}`);
        return;
      }
      const hint =
        data.keyPrefix || data.priceIdPrefix
          ? ` [${[data.keyPrefix && `key=${data.keyPrefix}`, data.priceIdPrefix && `price=${data.priceIdPrefix}`]
              .filter(Boolean)
              .join(" ")}]`
          : "";
      setError(
        (data.message ||
          (data.error === "billing_not_configured"
            ? "Stripe is not configured yet. Check STRIPE_SECRET_KEY + STRIPE_PRICE_PRO_YEARLY and restart npm run dev."
            : data.error
              ? `Checkout failed: ${data.error}`
              : `Checkout failed (HTTP ${res.status}). Try again or contact sales.`)) + hint
      );
    } catch (e) {
      setError(e instanceof Error ? `Checkout failed: ${e.message}` : "Checkout failed. Try again or contact sales.");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setError("");
    setBusy("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error === "no_customer" ? "No Stripe customer on this account yet." : "Billing portal unavailable.");
    } catch {
      setError("Billing portal unavailable.");
    } finally {
      setBusy(null);
    }
  }

  function selectDemoPlan(plan: PlanId) {
    if (plan === "enterprise") {
      setEnterpriseOpen(true);
      return;
    }
    if (session) {
      setPlan(plan);
      router.push("/");
      return;
    }
    router.push(`/login?plan=${plan}`);
  }

  function handleCta(plan: PlanId) {
    if (stripeLive) {
      if (plan === "free") {
        if (session) {
          router.push("/");
          return;
        }
        router.push("/sign-up");
        return;
      }
      if (plan === "pro") {
        void startCheckout("pro");
        return;
      }
      void startCheckout("enterprise");
      return;
    }
    selectDemoPlan(plan);
  }

  function enterAsEnterprise() {
    if (mode === "clerk") {
      setEnterpriseOpen(false);
      return;
    }
    if (session) {
      setPlan("enterprise");
    } else {
      login("enterprise.demo@purplegap.demo", "enterprise");
    }
    setEnterpriseOpen(false);
    router.push("/");
  }

  function ctaLabel(plan: PlanId, defaultCta: string) {
    if (busy === plan) return "Redirecting…";
    if (stripeLive) {
      if (plan === "free") return session ? "Go to dashboard" : "Start free";
      if (plan === "pro") return "Upgrade to Pro";
      return config?.enterpriseCheckout ? "Upgrade to Enterprise" : "Contact sales";
    }
    return defaultCta;
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Freemium for PBM buyers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Plans that match formulary workflows
        </h1>
        <p className="mt-3 text-slate-600">
          {stripeLive
            ? "Pro is billed annually via Stripe Checkout ($6,000/yr). Enterprise can check out if a price is configured, otherwise contact sales."
            : mode === "clerk"
              ? "SSO is on. Stripe keys are not set — upgrade buttons will prompt contact sales until billing is configured."
              : "Demo pricing — buttons set your local session plan. Add Clerk + Stripe keys for real SSO and checkout."}{" "}
          <span className="font-medium text-slate-800">
            CMS Part D Prescribers CY2024 (filtered) + FDA Purple Book — not a full national dump.
          </span>
        </p>
      </div>

      {checkoutStatus === "success" ? (
        <p className="mx-auto mt-6 max-w-xl rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800">
          Checkout complete. Your plan updates after the Stripe webhook syncs Clerk metadata — refresh if the badge lags.
        </p>
      ) : null}
      {checkoutStatus === "canceled" ? (
        <p className="mx-auto mt-6 max-w-xl rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Checkout canceled. You can try again whenever you are ready.
        </p>
      ) : null}
      {error ? (
        <p className="mx-auto mt-6 max-w-xl rounded-md border border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {mode === "clerk" && session && stripeLive ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={busy === "portal"}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {busy === "portal" ? "Opening portal…" : "Manage billing"}
          </button>
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {PLAN_CARDS.map((card) => (
          <div
            key={card.id}
            className={`flex flex-col rounded-xl border p-6 shadow-sm ${
              card.highlight
                ? "border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{card.name}</h2>
              {card.highlight ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                  <Sparkles className="h-3 w-3" /> Popular
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-slate-900">{card.price}</span>
              <span className="text-sm text-slate-500">{card.period}</span>
            </div>
            <p className="mt-2 flex-1 text-sm text-slate-600">{card.blurb}</p>
            <button
              type="button"
              disabled={busy === card.id}
              onClick={() => handleCta(card.id)}
              className={`mt-5 w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                card.highlight
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              {ctaLabel(card.id, card.cta)}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Feature comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="bg-white text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Capability</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Free</th>
                <th className="px-4 py-3 text-center font-semibold text-indigo-700">Pro</th>
                <th className="px-4 py-3 text-center font-semibold text-violet-800">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PRICING_FEATURES.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-800">{row.label}</td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.free} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.pro} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href={mode === "clerk" ? "/sign-in" : "/login"} className="font-medium text-indigo-600 hover:underline">
          Sign in
        </Link>
        {mode === "clerk" ? (
          <>
            {" "}
            or email{" "}
            <a href={`mailto:${SALES_EMAIL}?subject=Enterprise%20plan`} className="font-medium text-indigo-600 hover:underline">
              {SALES_EMAIL}
            </a>
          </>
        ) : (
          " or switch plan from the header Upgrade control."
        )}
      </p>

      <EnterpriseDemoModal open={enterpriseOpen} onClose={() => setEnterpriseOpen(false)} />
      {enterpriseOpen && mode === "demo" ? (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-center shadow-lg">
          <p className="text-xs text-violet-900">
            Demo shortcut: continue into the app as Enterprise after the sales stub.
          </p>
          <button
            type="button"
            onClick={enterAsEnterprise}
            className="mt-2 rounded-md bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
          >
            Enter as Enterprise (demo)
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading pricing…</div>}>
      <PricingInner />
    </Suspense>
  );
}
