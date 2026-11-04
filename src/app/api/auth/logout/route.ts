import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookies,
  ensureAuthSchemaInNeon,
  extractSessionTokenFromRequest,
  guardSameOriginMutation,
  verifySessionToken,
} from "../../../lib/auth-server";
import { executeNeonSql, getNeonConnectionString } from "../../../lib/neon-clerk";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rawToken = extractSessionTokenFromRequest(request);
  const session = await verifySessionToken(rawToken);

  if (session && getNeonConnectionString()) {
    try {
      await ensureAuthSchemaInNeon();
      await executeNeonSql(
        `UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1`,
        [session.sid]
      );
      await executeNeonSql(
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
  // modern-web-guidance (security §Clear-Site-Data): terminate session cookies cleanly
  response.headers.set("Clear-Site-Data", '"cookies"');
  return response;
}
