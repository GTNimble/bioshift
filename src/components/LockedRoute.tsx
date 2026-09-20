"use client";

import { PlanGate } from "@/components/PlanGate";
import type { FeatureKey, PlanId } from "@/lib/plans";

export function LockedRoute({
  feature,
  requiredPlan = "pro",
  title,
  description,
  children,
}: {
  feature: FeatureKey;
  requiredPlan?: PlanId;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <PlanGate
      feature={feature}
      requiredPlan={requiredPlan}
      title={title}
      description={description}
      className="min-h-[28rem]"
    >
      {children}
    </PlanGate>
  );
}
