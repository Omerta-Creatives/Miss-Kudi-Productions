import { NextRequest, NextResponse } from "next/server";
import {
  extractSessionTokenFromRequest,
  verifySessionToken,
} from "./app/lib/auth-server";

const PROTECTED_PREFIXES = [
  "/superadmin",
  "/dashboard",
  "/workspace",
  "/tracker",
];

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()"
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const rawToken = extractSessionTokenFromRequest(request);
  const session = await verifySessionToken(rawToken);

  if (isProtected) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      loginUrl.searchParams.set("reason", "auth_required");
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Strict RBAC tier gate: only superadmin can enter /superadmin
    if (
      (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) &&
      session.accessTier !== "superadmin"
    ) {
      const dashUrl = new URL("/dashboard", request.url);
      dashUrl.searchParams.set("notice", "superadmin_only");
      return applySecurityHeaders(NextResponse.redirect(dashUrl));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-mkp-user-email", session.email);
    requestHeaders.set("x-mkp-access-tier", session.accessTier);
    requestHeaders.set("x-mkp-remember", session.rememberMe ? "1" : "0");

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return applySecurityHeaders(response);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/dashboard/:path*",
    "/workspace/:path*",
    "/tracker/:path*",
    "/login",
    "/reset-password",
  ],
};
