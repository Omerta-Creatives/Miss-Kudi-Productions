import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  ensureAuthSchema,
  guardSameOriginMutation,
  hashPassword,
  validatePasswordStrength,
  verifyResetOtpChallenge,
} from "../../../lib/auth-server";
import {
  executeSqlQuery,
  getDatabaseConnectionString,
} from "../../../lib/database";
import {
  ArtisanRole,
  ArtisanStaff,
  INITIAL_ARTISANS,
  INITIAL_BRANCHES,
  sanitizeSpecialtyText,
  UserAccessTier,
} from "../../../lib/production-os";
import {
  attachRateLimitHeaders,
  enforceRequestRateLimit,
  RATE_LIMIT_PROFILES,
} from "../../../lib/rate-limit";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const ipCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.authRecoveryIp,
    undefined,
    "Too many password reset verification attempts. Please wait before trying again."
  );
  if (ipCheck.blocked) return ipCheck.blocked;

  try {
    const body = await request.json();
    const cleanEmail = String(body.email || "")
      .trim()
      .toLowerCase();
    const code = String(body.code || "").trim();
    const newPassword = String(body.newPassword || "");
    const resetChallenge = body.resetChallenge
      ? String(body.resetChallenge)
      : null;
    const rememberMe = Boolean(body.rememberMe ?? true);
    const autoSignIn = body.autoSignIn !== false;
    const fallbackAccount = body.fallbackAccount as ArtisanStaff | undefined;

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "Valid work email is required." },
          { status: 400 }
        ),
        ipCheck.result
      );
    }

    const accountCheck = enforceRequestRateLimit(
      request,
      RATE_LIMIT_PROFILES.authRecoveryAccount,
      cleanEmail,
      "Too many code verification attempts for this email. Please wait 15 minutes before trying again."
    );
    if (accountCheck.blocked) return accountCheck.blocked;

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: strengthError },
          { status: 400 }
        ),
        accountCheck.result
      );
    }

    const otpCheck = await verifyResetOtpChallenge(
      cleanEmail,
      code,
      resetChallenge
    );
    if (!otpCheck.valid) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error:
              otpCheck.reason || "Invalid or expired 6-digit verification code.",
          },
          { status: 400 }
        ),
        accountCheck.result
      );
    }

    const passwordHash = await hashPassword(newPassword);
    let matchedUser: ArtisanStaff | null =
      INITIAL_ARTISANS.find((a) => a.email.toLowerCase() === cleanEmail) ||
      (fallbackAccount?.email?.toLowerCase() === cleanEmail
        ? {
            ...fallbackAccount,
            specialty: sanitizeSpecialtyText(fallbackAccount.specialty),
          }
        : null);

    if (getDatabaseConnectionString()) {
      try {
        await ensureAuthSchema();
        const { rows } = await executeSqlQuery<Record<string, any>>(
          `SELECT
            id, name, email, access_tier, artisan_role, branch_id, branch_name,
            specialty, station, active_runs, units_completed_month, qc_pass_rate,
            shift_status, floor_status
           FROM staff_users
           WHERE LOWER(email) = $1
           LIMIT 1`,
          [cleanEmail]
        );

        if (rows.length > 0) {
          const r = rows[0];
          matchedUser = {
            id: String(r.id),
            name: String(r.name),
            email: String(r.email).toLowerCase(),
            accessTier: (r.access_tier as UserAccessTier) || "staff",
            role: (r.artisan_role as ArtisanRole) || "tailor",
            branchId: String(r.branch_id || INITIAL_BRANCHES[0].id),
            branchName: String(r.branch_name || INITIAL_BRANCHES[0].name),
            specialty: sanitizeSpecialtyText(String(r.specialty || "")),
            station: String(r.station || "Main Factory Floor"),
            activeRuns: Number(r.active_runs ?? 0),
            unitsCompletedMonth: Number(r.units_completed_month ?? 0),
            qcPassRate: Number(r.qc_pass_rate ?? 99.0),
            shiftStatus:
              r.shift_status === "OFF_SHIFT" ? "OFF_SHIFT" : "CLOCKED_IN",
            status:
              (r.floor_status as ArtisanStaff["status"]) || "Active on Floor",
          };

          await executeSqlQuery(
            `UPDATE staff_users
             SET password_hash = $2,
                 must_reset_password = FALSE,
                 failed_login_attempts = 0,
                 locked_until = NULL,
                 password_changed_at = NOW()
             WHERE LOWER(email) = $1`,
            [cleanEmail, passwordHash]
          );
        } else if (matchedUser) {
          await executeSqlQuery(
            `INSERT INTO staff_users (
              id, name, email, password_hash, access_tier, artisan_role,
              branch_name, specialty, station, active_runs,
              units_completed_month, qc_pass_rate, shift_status, floor_status, password_changed_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
            ON CONFLICT (email) DO UPDATE SET
              password_hash = EXCLUDED.password_hash,
              failed_login_attempts = 0,
              locked_until = NULL,
              password_changed_at = NOW()`,
            [
              matchedUser.id,
              matchedUser.name,
              cleanEmail,
              passwordHash,
              matchedUser.accessTier,
              matchedUser.role,
              matchedUser.branchName,
              matchedUser.specialty,
              matchedUser.station,
              matchedUser.activeRuns,
              matchedUser.unitsCompletedMonth,
              matchedUser.qcPassRate,
              matchedUser.shiftStatus,
              matchedUser.status,
            ]
          );
        }

        await executeSqlQuery(
          `UPDATE auth_sessions SET revoked_at = NOW() WHERE LOWER(email) = $1 AND revoked_at IS NULL`,
          [cleanEmail]
        ).catch(() => {});

        await executeSqlQuery(
          `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            `aud-${Date.now()}`,
            "auth.password_reset_completed",
            matchedUser?.name || cleanEmail,
            matchedUser?.accessTier?.toUpperCase() || "STAFF",
            cleanEmail,
            `Completed OTP-verified password reset and revoked prior sessions for ${cleanEmail}.`,
          ]
        ).catch(() => {});
      } catch {
        // Continue with client hybrid password hash sync
      }
    }

    if (!matchedUser) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error: "Account profile could not be resolved after verification.",
          },
          { status: 404 }
        ),
        accountCheck.result
      );
    }

    if (autoSignIn) {
      const { token, payload } = await createSessionToken(
        matchedUser,
        rememberMe
      );
      const expiresAtIso = new Date(payload.exp * 1000).toISOString();
      const response = NextResponse.json({
        ok: true,
        signedIn: true,
        passwordHash,
        user: matchedUser,
        session: {
          sessionId: payload.sid,
          rememberMe,
          expiresAt: expiresAtIso,
          issuedAt: new Date(payload.iat * 1000).toISOString(),
        },
      });
      attachSessionCookie(response, request, token, rememberMe);
      return attachRateLimitHeaders(response, accountCheck.result);
    }

    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        signedIn: false,
        passwordHash,
        user: matchedUser,
      }),
      accountCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { ok: false, error: err?.message || "Password reset failed." },
        { status: 500 }
      ),
      ipCheck.result
    );
  }
}
