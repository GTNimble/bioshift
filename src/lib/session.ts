import {
  SESSION_COOKIE,
  SESSION_STORAGE_KEY,
  type PlanId,
  type Session,
} from "@/lib/plans";

export function isValidPlan(value: unknown): value is PlanId {
  return value === "free" || value === "pro" || value === "enterprise";
}

export function parseSessionJson(raw: string | null | undefined): Session | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Session>;
    if (typeof data.email === "string" && data.email.trim() && isValidPlan(data.plan)) {
      return { email: data.email.trim(), plan: data.plan };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Client: read session from localStorage (preferred) or cookie */
export function readClientSession(): Session | null {
  if (typeof window === "undefined") return null;
  const fromStorage = parseSessionJson(window.localStorage.getItem(SESSION_STORAGE_KEY));
  if (fromStorage) return fromStorage;
  return parseSessionJson(readCookie(SESSION_COOKIE));
}

export function writeClientSession(session: Session): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  window.localStorage.setItem(SESSION_STORAGE_KEY, raw);
  // Cookie for middleware (non-HttpOnly demo cookie)
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(raw)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Server / middleware: parse cookie header value */
export function parseSessionCookieValue(cookieHeader: string | null | undefined): Session | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return parseSessionJson(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
