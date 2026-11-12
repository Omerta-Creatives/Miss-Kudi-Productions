import { NextRequest, NextResponse } from "next/server";
import {
  ensureAuthSchema,
  extractSessionTokenFromRequest,
  guardSameOriginMutation,
  hashPassword,
  validatePasswordStrength,
  verifyPasswordHash,
  verifySeededDefaultPassword,
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
  const actorSession = await verifySessionToken(rawToken);
  if (!actorSession) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { ok: false, error: "Active authenticated session required." },
        { status: 401 }
      ),
      rateCheck.result
    );
  }

  try {
    const body = await request.json();
    const targetEmail = String(body.targetEmail || actorSession.email)
      .trim()
      .toLowerCase();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const fallbackPasswordHash = body.fallbackPasswordHash as string | undefined;

    const isSelf = targetEmail === actorSession.email.toLowerCase();

    if (!isSelf) {
      if (actorSession.accessTier === "staff") {
        return attachRateLimitHeaders(
          NextResponse.json(
            { ok: false, error: "Floor staff can only change their own password." },
            { status: 403 }
          ),
          rateCheck.result
        );
      }
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: strengthError },
          { status: 400 }
        ),
        rateCheck.result
      );
    }

    let existingDbHash: string | null = null;
    let targetTier = "staff";

    if (getDatabaseConnectionString()) {
      try {
        await ensureAuthSchema();
        const { rows } = await executeSqlQuery<{
          password_hash: string | null;
          access_tier: string;
        }>(
          `SELECT password_hash, access_tier FROM staff_users WHERE LOWER(email) = $1 LIMIT 1`,
          [targetEmail]
        );
        if (rows.length > 0) {
          existingDbHash = rows[0].password_hash;
          targetTier = rows[0].access_tier || "staff";
        }
      } catch {
        // Fallback to hybrid verification
      }
    }

    if (
      !isSelf &&
      targetTier === "superadmin" &&
      actorSession.accessTier !== "superadmin"
    ) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error: "Only Superadmin HQ can update a Superadmin password.",
          },
          { status: 403 }
        ),
        rateCheck.result
      );
    }

    if (isSelf) {
      if (!currentPassword) {
        return attachRateLimitHeaders(
          NextResponse.json(
            { ok: false, error: "Please enter your current password." },
            { status: 400 }
          ),
          rateCheck.result
        );
      }
      const effectiveHash = existingDbHash || fallbackPasswordHash || null;
      const currentValid = effectiveHash
        ? await verifyPasswordHash(currentPassword, effectiveHash)
        : verifySeededDefaultPassword(targetEmail, currentPassword);

      if (!currentValid) {
        return attachRateLimitHeaders(
          NextResponse.json(
            { ok: false, error: "Your current password is incorrect." },
            { status: 401 }
          ),
          rateCheck.result
        );
      }
    }

    const nextHash = await hashPassword(newPassword);

    if (getDatabaseConnectionString()) {
      try {
        await ensureAuthSchema();
        await executeSqlQuery(
          `UPDATE staff_users
           SET password_hash = $2,
               must_reset_password = FALSE,
               failed_login_attempts = 0,
               locked_until = NULL,
               password_changed_at = NOW()
           WHERE LOWER(email) = $1`,
          [targetEmail, nextHash]
        );
        await executeSqlQuery(
          `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            `aud-${Date.now()}`,
            isSelf ? "auth.password_changed" : "team.password_reset_by_admin",
            actorSession.name,
            actorSession.accessTier.toUpperCase(),
            targetEmail,
            isSelf
              ? `${actorSession.name} updated their account password.`
              : `${actorSession.name} (${actorSession.accessTier.toUpperCase()}) set a new password for ${targetEmail}.`,
          ]
        );
      } catch {
        // Continue with client hybrid sync
      }
    }

    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        targetEmail,
        passwordHash: nextHash,
        message: isSelf
          ? "Your password has been updated."
          : `Password updated for ${targetEmail}.`,
      }),
      rateCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { ok: false, error: err?.message || "Unable to update password." },
        { status: 500 }
      ),
      rateCheck.result
    );
  }
}
