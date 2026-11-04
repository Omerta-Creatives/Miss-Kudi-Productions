import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookies,
  ensureAuthSchema,
  extractSessionTokenFromRequest,
  guardSameOriginMutation,
  verifySessionToken,
} from "../../../lib/auth-server";
import {
  executeSqlQuery,
  getDatabaseConnectionString,
} from "../../../lib/database";
import {
  attachRateLimitHeaders,
  enforceRequestRateLimit,
  RATE_LIMIT_PROFILES,
} from "../../../lib/rate-limit";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rateCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.authMutation
  );
  if (rateCheck.blocked) return rateCheck.blocked;

  const rawToken = extractSessionTokenFromRequest(request);
  const session = await verifySessionToken(rawToken);

  if (session && getDatabaseConnectionString()) {
    try {
      await ensureAuthSchema();
      await executeSqlQuery(
        `UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1`,
        [session.sid]
      );
      await executeSqlQuery(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "auth.sign_out",
          session.name,
          session.accessTier.toUpperCase(),
          session.email,
          `Signed out and terminated session ${session.sid}.`,
        ]
      );
    } catch {
      // Non-blocking if database is offline
    }
  }

  const response = NextResponse.json({ ok: true, signedOut: true });
  clearSessionCookies(response, request);
  response.headers.set("Clear-Site-Data", '"cookies"');
  return attachRateLimitHeaders(response, rateCheck.result);
}
