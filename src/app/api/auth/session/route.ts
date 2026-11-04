import { NextRequest, NextResponse } from "next/server";
import {
  ensureAuthSchema,
  extractSessionTokenFromRequest,
  payloadToArtisan,
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

export async function GET(request: NextRequest) {
  const { blocked, result } = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.authSession
  );
  if (blocked) return blocked;

  const rawToken = extractSessionTokenFromRequest(request);
  const payload = await verifySessionToken(rawToken);

  if (!payload) {
    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        authenticated: false,
        user: null,
        session: null,
      }),
      result
    );
  }

  if (getDatabaseConnectionString()) {
    try {
      await ensureAuthSchema();
      const { rows } = await executeSqlQuery<{ revoked_at: string | null }>(
        `SELECT revoked_at FROM auth_sessions WHERE id = $1 LIMIT 1`,
        [payload.sid]
      );
      if (rows.length > 0 && rows[0].revoked_at) {
        return attachRateLimitHeaders(
          NextResponse.json({
            ok: true,
            authenticated: false,
            user: null,
            session: null,
          }),
          result
        );
      }
    } catch {
      // Allow cryptographically valid token when database is unreachable
    }
  }

  return attachRateLimitHeaders(
    NextResponse.json({
      ok: true,
      authenticated: true,
      user: payloadToArtisan(payload),
      session: {
        sessionId: payload.sid,
        rememberMe: payload.rememberMe,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      },
    }),
    result
  );
}
