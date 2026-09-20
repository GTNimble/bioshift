"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PLAN_LABELS, type FeatureKey, type PlanId } from "@/lib/plans";

export function PlanGate({
  feature,
  requiredPlan = "pro",
  children,
  title,
  description,
  className = "",
  blur = true,
}: {
  feature: FeatureKey;
  requiredPlan?: PlanId;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  blur?: boolean;
}) {
  const { hasFeature, session, mode } = useAuth();
  const allowed = hasFeature(feature);

  if (allowed) return <>{children}</>;

  const planLabel = PLAN_LABELS[requiredPlan];
  const heading = title ?? `${planLabel} feature`;
  const body =
    description ??
    `Upgrade to ${planLabel} to unlock this module. Your current plan is ${
      session ? PLAN_LABELS[session.plan] : "none"
    }.`;

  return (
    <div className={`relative ${className}`}>
      <div className={blur ? "pointer-events-none select-none blur-[2px] opacity-40" : "hidden"} aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white/95 p-6 text-center shadow-lg backdrop-blur">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{heading}</h3>
          <p className="mt-2 text-sm text-slate-600">{body}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade plan
            </Link>
            {mode === "demo" ? (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Switch demo plan
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnterpriseGate({
  feature,
  children,
  title,
  description,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <PlanGate
      feature={feature}
      requiredPlan="enterprise"
      title={title}
      description={description}
    >
      {children}
    </PlanGate>
  );
}
