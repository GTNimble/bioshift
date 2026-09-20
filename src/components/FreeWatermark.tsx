"use client";

import { useAuth } from "@/components/AuthProvider";

export function FreeWatermark() {
  const { session } = useAuth();
  if (!session || session.plan !== "free") return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[35] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-x-24 gap-y-32 opacity-[0.06]">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="rotate-[-24deg] text-4xl font-bold tracking-widest text-slate-900"
          >
            Free plan
          </span>
        ))}
      </div>
    </div>
  );
}
