"use client";

import { useMemo, useState, Suspense, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { EnterpriseDemoModal } from "@/components/EnterpriseDemoModal";
import { PLAN_CARDS, type PlanId } from "@/lib/plans";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, mode, demoAllowed, session } = useAuth();

  const initialPlan = (searchParams.get("plan") as PlanId | null) ?? "pro";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<PlanId>(
    initialPlan === "free" || initialPlan === "pro" || initialPlan === "enterprise"
      ? initialPlan
      : "pro"
  );
  const [error, setError] = useState("");
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/";
  }, [searchParams]);

  const ssoHref = useMemo(() => {
    const redirect = nextPath && nextPath !== "/" ? nextPath : "/";
    return `/sign-in?redirect_url=${encodeURIComponent(redirect)}`;
  }, [nextPath]);

  function completeLogin(nextEmail: string, nextPlan: PlanId) {
    login(nextEmail, nextPlan);
    router.push(nextPath);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter any non-empty email and password for this demo.");
      return;
    }
    completeLogin(email.trim(), plan);
  }

  function continueAsGuest() {
    completeLogin("guest@purplegap.demo", "free");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          PBM / Part D formulary buyers
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Sign in to PurpleGap
        </h1>
        <p className="mt-3 text-slate-600">
          {mode === "clerk"
            ? "Sign in with SSO (Google, Microsoft, or email via Clerk). Your plan is synced from Stripe to Clerk publicMetadata."
            : "Local demo session — Clerk keys are not configured. Use any email and password, pick a plan, and explore freemium gating."}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          <Shield className="h-3.5 w-3.5 text-indigo-600" />
          CMS Part D CY2024 (filtered) + FDA Purple Book
        </p>

        <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {mode === "clerk" ? (
            <>
              <Link
                href={ssoHref}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Sign in with SSO
              </Link>
              <Link
                href={`/sign-up?redirect_url=${encodeURIComponent(nextPath)}`}
                className="flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Create an account
              </Link>
              {session ? (
                <Link
                  href="/"
                  className="block text-center text-sm font-medium text-indigo-600 hover:underline"
                >
                  Continue to dashboard as {session.email}
                </Link>
              ) : null}
            </>
          ) : null}

          {demoAllowed ? (
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "clerk" ? (
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Continue with demo session
                </p>
              ) : (
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Demo session (no Clerk keys)
                </p>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@pbm.example"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Any non-empty value"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Demo plan</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(["free", "pro", "enterprise"] as PlanId[]).map((p) => (
                    <label
                      key={p}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium capitalize transition ${
                        plan === p
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={p}
                        checked={plan === p}
                        onChange={() => setPlan(p)}
                        className="sr-only"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                Continue with demo session
              </button>

              <button
                type="button"
                onClick={continueAsGuest}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Continue as guest (Free)
              </button>
            </form>
          ) : null}

          <p className="text-center text-xs text-slate-500">
            Looking for a walkthrough?{" "}
            <button
              type="button"
              onClick={() => setEnterpriseOpen(true)}
              className="font-medium text-indigo-600 hover:underline"
            >
              Contact sales
            </button>
          </p>
        </div>
      </div>

      <div>
        <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/20">
          <Image
            src="/illustrations/login-hero.svg"
            alt="Abstract PurpleGap dashboard preview with KPI cards and charts — no identifiable people"
            width={520}
            height={420}
            className="h-auto w-full"
            priority
            unoptimized
          />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Compare plans</h2>
          <Link href="/pricing" className="text-sm font-medium text-indigo-600 hover:underline">
            Full comparison →
          </Link>
        </div>
        <div className="space-y-3">
          {PLAN_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (card.id === "enterprise") {
                  setPlan("enterprise");
                  setEnterpriseOpen(true);
                  return;
                }
                setPlan(card.id);
              }}
              className={`w-full rounded-xl border p-5 text-left shadow-sm transition ${
                plan === card.id
                  ? "border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-300"
                  : card.highlight
                    ? "border-indigo-200 bg-white hover:border-indigo-300"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{card.name}</span>
                    {card.highlight ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        <Sparkles className="h-3 w-3" /> Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{card.blurb}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold text-slate-900">{card.price}</div>
                  <div className="text-xs text-slate-500">{card.period}</div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {(card.id === "free"
                  ? ["Overview + About", "Top 3 sample opportunities", "Free plan watermark"]
                  : card.id === "pro"
                    ? ["Full drugs / NPIs / geography", "Alerts + CSV export", "Limited territory packs"]
                    : ["Plan–prescribing gap", "API feed + multi-seat stubs", "Priority alerts"]
                ).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-sm font-medium text-indigo-700">{card.cta}</div>
            </button>
          ))}
        </div>
      </div>

      <EnterpriseDemoModal open={enterpriseOpen} onClose={() => setEnterpriseOpen(false)} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading sign-in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
