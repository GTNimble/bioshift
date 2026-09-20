import { NextResponse } from "next/server";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/authMode";

const SESSION_COOKIE = "purplegap_session";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/about(.*)",
  "/api/stripe/webhook(.*)",
  "/api/stripe/config(.*)",
  "/api/v1(.*)",
]);

function isStaticish(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

function hasDemoSessionCookie(req: NextRequest): boolean {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as { email?: string; plan?: string };
    return Boolean(data?.email && data?.plan);
  } catch {
    try {
      const data = JSON.parse(raw) as { email?: string; plan?: string };
      return Boolean(data?.email && data?.plan);
    } catch {
      return false;
    }
  }
}

function demoMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isStaticish(pathname) || isPublicRoute(req)) {
    return NextResponse.next();
  }
  if (!hasDemoSessionCookie(req)) {
    const login = new URL("/login", req.url);
    if (pathname !== "/") {
      login.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

let clerkHandler: NextMiddleware | null = null;

function getClerkHandler() {
  if (clerkHandler) return clerkHandler;
  clerkHandler = clerkMiddleware(async (auth, req) => {
    if (!isClerkEnabled()) {
      return demoMiddleware(req);
    }
    if (isPublicRoute(req) || isStaticish(req.nextUrl.pathname)) {
      return NextResponse.next();
    }
    // Let API handlers return JSON 401 instead of an HTML redirect.
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    const { userId } = await auth();
    if (!userId) {
      const login = new URL("/login", req.url);
      if (req.nextUrl.pathname !== "/") {
        login.searchParams.set("next", req.nextUrl.pathname);
      }
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  });
  return clerkHandler;
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isClerkEnabled()) {
    return getClerkHandler()(req, event);
  }
  return demoMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
