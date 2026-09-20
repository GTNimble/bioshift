"use client";

import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function ExportButton({
  href = "/api/export/opportunities",
  label = "Export opportunity CSV",
  requireEnterprise = false,
  enterpriseBadge = false,
  compact = false,
}: {
  href?: string;
  label?: string;
  /** Gate on list_exports / full_monetize_exports (Enterprise) */
  requireEnterprise?: boolean;
  /** Show Enterprise badge on allowed button */
  enterpriseBadge?: boolean;
  /** Compact link style for table cells */
  compact?: boolean;
}) {
  const { hasFeature } = useAuth();
  const allowed = requireEnterprise
    ? hasFeature("list_exports") || hasFeature("full_monetize_exports")
    : hasFeature("csv_export");

  if (!allowed) {
    if (compact) {
      return (
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline"
          title="Enterprise export"
          onClick={(e) => e.stopPropagation()}
        >
          <Lock className="h-3 w-3" />
          Enterprise
        </Link>
      );
    }
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        title={requireEnterprise ? "Enterprise export" : "Pro+ export"}
      >
        <Lock className="h-4 w-4 text-slate-400" />
        {requireEnterprise ? (
          <span>
            {label} <span className="text-violet-700">· Enterprise export</span>
          </span>
        ) : (
          <span>{label} (Pro+)</span>
        )}
      </Link>
    );
  }

  if (compact) {
    return (
      <a
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900 hover:underline"
        title={label}
      >
        <Download className="h-3 w-3" />
        {label}
      </a>
    );
  }

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white hover:opacity-95 ${
        requireEnterprise || enterpriseBadge
          ? "bg-violet-700 hover:bg-violet-800"
          : "bg-slate-900 hover:bg-slate-800"
      }`}
    >
      <Download className="h-4 w-4" />
      {label}
      {requireEnterprise || enterpriseBadge ? (
        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Enterprise
        </span>
      ) : null}
    </a>
  );
}
