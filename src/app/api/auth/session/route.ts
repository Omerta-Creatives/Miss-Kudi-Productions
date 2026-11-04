import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  ensureAuthSchemaInNeon,
  extractSessionTokenFromRequest,
  guardSameOriginMutation,
  payloadToArtisan,
  verifySessionToken,
} from "../../../lib/auth-server";
import { executeNeonSql, getNeonConnectionString } from "../../../lib/neon-clerk";
import { ArtisanStaff, INITIAL_ARTISANS } from "../../../lib/production-os";

export async function GET(request: NextRequest) {
  const rawToken = extractSessionTokenFromRequest(request);
  const payload = await verifySessionToken(rawToken);

  if (!payload) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      user: null,
      session: null,
    });
  }

  // Verify session has not been revoked in Neon if reachable
  if (getNeonConnectionString()) {
    try {
      await ensureAuthSchemaInNeon();
      const { rows } = await executeNeonSql<{ revoked_at: string | null }>(
        `SELECT revoked_at FROM auth_sessions WHERE id = $1 LIMIT 1`,
        [payload.sid]
      );
      if (rows.length > 0 && rows[0].revoked_at) {
        return NextResponse.json({
          ok: true,
          authenticated: false,
          user: null,
          session: null,
        });
      }
    } catch {
      // Allow cryptographically valid token when database is unreachable
    }
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: payloadToArtisan(payload),
    session: {
      sessionId: payload.sid,
      rememberMe: payload.rememberMe,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      issuedAt: new Date(payload.iat * 1000).toISOString(),
    },
  });
}

/**
 * Allows an authenticated Superadmin session to preview/switch into a subordinate
 * Admin or Floor Staff station without losing cryptographic cookie integrity.
 * Blocks privilege escalation from Staff or Admin accounts.
 */
export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rawToken = extractSessionTokenFromRequest(request);
  const activePayload = await verifySessionToken(rawToken);
  if (!activePayload || activePayload.accessTier !== "superadmin") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only an authenticated Superadmin session can switch station roles without re-entering credentials.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const targetUser = body.targetUser as ArtisanStaff | undefined;
  const matched =
    targetUser ||
    INITIAL_ARTISANS.find((a) => a.id === body.userId || a.email === body.email);

  if (!matched) {
    return NextResponse.json(
      { ok: false, error: "Target account not found." },
      { status: 404 }
    );
  }

  const { token, payload } = await createSessionToken(
    matched,
    activePayload.rememberMe
  );
  const response = NextResponse.json({
    ok: true,
    user: matched,
    session: {
      sessionId: payload.sid,
      rememberMe: payload.rememberMe,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      issuedAt: new Date(payload.iat * 1000).toISOString(),
    },
  });
  attachSessionCookie(response, request, token, activePayload.rememberMe);
  return response;
}
