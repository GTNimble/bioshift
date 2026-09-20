"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  Factory,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Package,
  Pill,
  Sparkles,
  Syringe,
  Users,
  Info,
  Bookmark,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PLAN_BADGE_CLASSES, PLAN_LABELS } from "@/lib/plans";
import { useState, type ReactNode } from "react";

const links: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { href: "/drugs", label: "Drugs", icon: <Pill className="h-3.5 w-3.5" /> },
  { href: "/prescribers", label: "Prescribers", icon: <Users className="h-3.5 w-3.5" /> },
  { href: "/partb", label: "Part B", icon: <Syringe className="h-3.5 w-3.5" /> },
  { href: "/accounts", label: "Accounts", icon: <Building2 className="h-3.5 w-3.5" /> },
  { href: "/geography", label: "Geography", icon: <MapPinned className="h-3.5 w-3.5" /> },
  { href: "/alerts", label: "Alerts", icon: <Bell className="h-3.5 w-3.5" /> },
  { href: "/watchlists", label: "Watchlists", icon: <Bookmark className="h-3.5 w-3.5" /> },
  { href: "/makers", label: "Makers", icon: <Factory className="h-3.5 w-3.5" /> },
  { href: "/monetize", label: "Pricing & Packs", icon: <Package className="h-3.5 w-3.5" /> },
  { href: "/about", label: "About", icon: <Info className="h-3.5 w-3.5" /> },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, ready, mode } = useAuth();
  const [portalError, setPortalError] = useState("");

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/pricing" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up");

  async function openPortal() {
    setPortalError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setPortalError(data.error === "no_customer" ? "No billing customer yet." : "Portal unavailable.");
    } catch {
      setPortalError("Portal unavailable.");
    }
  }

  const signInHref = mode === "clerk" ? "/sign-in" : "/login";

  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href={session ? "/" : "/login"} className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/30">
              <Activity className="h-4 w-4" />
            </span>
            <span>
              Purple<span className="text-indigo-600">Gap</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/pricing" className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50">
              Pricing
            </Link>
            <Link href="/about" className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50">
              About
            </Link>
            {!session ? (
              <Link
                href={signInHref}
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                Sign in
              </Link>
            ) : (
              <Link
                href="/"
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                Dashboard
              </Link>
            )}
            {mode === "clerk" && session ? <UserButton afterSignOutUrl="/login" /> : null}
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/30">
            <Activity className="h-4 w-4" />
          </span>
          <span>
            Purple<span className="text-indigo-600">Gap</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition xl:text-sm ${
                  active
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-indigo-600" : "text-slate-400"}>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {ready && session ? (
            <>
              <span
                className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${PLAN_BADGE_CLASSES[session.plan]}`}
                title={session.email}
              >
                {PLAN_LABELS[session.plan]}
              </span>
              {session.plan !== "enterprise" ? (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 sm:text-sm sm:px-3"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade
                </Link>
              ) : null}
              {mode === "clerk" && session.plan !== "free" ? (
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  className="hidden items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex sm:text-sm sm:px-3"
                  title="Manage billing"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Billing
                </button>
              ) : null}
              {mode === "clerk" ? (
                <UserButton afterSignOutUrl="/login" />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm sm:px-3"
                  title="Log out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              )}
            </>
          ) : (
            <Link
              href={signInHref}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      {portalError ? (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-1 text-center text-xs text-amber-800">
          {portalError}
        </p>
      ) : null}
      <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
              }`}
            >
              {l.icon}
              {l.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
