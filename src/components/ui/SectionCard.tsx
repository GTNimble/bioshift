import type { ReactNode } from "react";

export function SectionCard({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
