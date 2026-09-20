"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import type { AuthMode } from "@/lib/authMode";
import type { PlanId, Session } from "@/lib/plans";
import { canAccess, parsePlanId, type FeatureKey } from "@/lib/plans";
import { clearClientSession, readClientSession, writeClientSession } from "@/lib/session";

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  mode: AuthMode;
  demoAllowed: boolean;
  login: (email: string, plan: PlanId) => void;
  logout: () => void;
  setPlan: (plan: PlanId) => void;
  hasFeature: (feature: FeatureKey) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readClientSession());
    setReady(true);
  }, []);

  const login = useCallback((email: string, plan: PlanId) => {
    const next: Session = { email: email.trim() || "guest@purplegap.demo", plan };
    writeClientSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearClientSession();
    setSession(null);
  }, []);

  const setPlan = useCallback((plan: PlanId) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, plan };
      writeClientSession(next);
      return next;
    });
  }, []);

  const hasFeature = useCallback(
    (feature: FeatureKey) => {
      if (!session) return false;
      return canAccess(session.plan, feature);
    },
    [session]
  );

  const value = useMemo(
    () => ({
      session,
      ready,
      mode: "demo" as const,
      demoAllowed: true,
      login,
      logout,
      setPlan,
      hasFeature,
    }),
    [session, ready, login, logout, setPlan, hasFeature]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  const session: Session | null = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user) return null;
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      user.id;
    return {
      email,
      plan: parsePlanId(user.publicMetadata?.plan),
    };
  }, [user, isLoaded, isSignedIn]);

  const login = useCallback(() => {
    /* Clerk mode: use /sign-in */
  }, []) as AuthContextValue["login"];

  const logout = useCallback(() => {
    void signOut({ redirectUrl: "/login" });
  }, [signOut]);

  const setPlan = useCallback(() => {
    /* Plan is owned by Stripe webhooks + Clerk publicMetadata */
  }, []) as AuthContextValue["setPlan"];

  const hasFeature = useCallback(
    (feature: FeatureKey) => {
      if (!session) return false;
      return canAccess(session.plan, feature);
    },
    [session]
  );

  const value = useMemo(
    () => ({
      session,
      ready: isLoaded,
      mode: "clerk" as const,
      demoAllowed: false,
      login,
      logout,
      setPlan,
      hasFeature,
    }),
    [session, isLoaded, login, logout, setPlan, hasFeature]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({
  mode,
  children,
}: {
  mode: AuthMode;
  children: ReactNode;
}) {
  if (mode === "clerk") {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }
  return <DemoAuthProvider>{children}</DemoAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
