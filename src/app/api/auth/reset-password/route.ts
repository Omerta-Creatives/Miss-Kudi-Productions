import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  ensureAuthSchemaInNeon,
  guardSameOriginMutation,
  hashPassword,
  validatePasswordStrength,
  verifyResetOtpChallenge,
} from "../../../lib/auth-server";
import {
  executeNeonSql,
  getNeonConnectionString,
  isClerkSecretConfigured,
} from "../../../lib/neon-clerk";
import {
  ArtisanRole,
  ArtisanStaff,
  INITIAL_ARTISANS,
  INITIAL_BRANCHES,
  UserAccessTier,
} from "../../../lib/production-os";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

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
      return NextResponse.json(
        { ok: false, error: "Valid work email is required." },
        { status: 400 }
      );
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json(
        { ok: false, error: strengthError },
        { status: 400 }
      );
    }

    const otpCheck = await verifyResetOtpChallenge(
      cleanEmail,
      code,
      resetChallenge
    );
    if (!otpCheck.valid) {
      return NextResponse.json(
        {
          ok: false,
          error:
            otpCheck.reason || "Invalid or expired 6-digit verification code.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    let matchedUser: ArtisanStaff | null =
      INITIAL_ARTISANS.find((a) => a.email.toLowerCase() === cleanEmail) ||
      (fallbackAccount?.email?.toLowerCase() === cleanEmail
        ? fallbackAccount
        : null);

    if (getNeonConnectionString()) {
      try {
        await ensureAuthSchemaInNeon();
        const { rows } = await executeNeonSql<Record<string, any>>(
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
            specialty: String(r.specialty || ""),
            station: String(r.station || "Main Factory Floor"),
            activeRuns: Number(r.active_runs ?? 0),
            unitsCompletedMonth: Number(r.units_completed_month ?? 0),
            qcPassRate: Number(r.qc_pass_rate ?? 99.0),
            shiftStatus:
              r.shift_status === "OFF_SHIFT" ? "OFF_SHIFT" : "CLOCKED_IN",
            status:
              (r.floor_status as ArtisanStaff["status"]) || "Active on Floor",
          };

          await executeNeonSql(
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
          // Seed account had not yet been inserted into staff_users — upsert with new hash
          await executeNeonSql(
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

        // Revoke any prior sessions for this user after password reset
        await executeNeonSql(
          `UPDATE auth_sessions SET revoked_at = NOW() WHERE LOWER(email) = $1 AND revoked_at IS NULL`,
          [cleanEmail]
        ).catch(() => {});

        await executeNeonSql(
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

    // Optional live Clerk password sync if Clerk Secret is active
    if (isClerkSecretConfigured()) {
      try {
        const clerkSecret = process.env.CLERK_SECRET_KEY!.trim();
        const searchRes = await fetch(
          `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(
            cleanEmail
          )}`,
          { headers: { Authorization: `Bearer ${clerkSecret}` } }
        );
        if (searchRes.ok) {
          const users = await searchRes.json();
          if (Array.isArray(users) && users.length > 0 && users[0].id) {
            await fetch(`https://api.clerk.com/v1/users/${users[0].id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${clerkSecret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                password: newPassword,
                skip_password_checks: true,
              }),
            });
          }
        }
      } catch {
        // Non-blocking if Clerk API is unreachable
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account profile could not be resolved after verification.",
        },
        { status: 404 }
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
      return response;
    }

    return NextResponse.json({
      ok: true,
      signedIn: false,
      passwordHash,
      user: matchedUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Password reset failed." },
      { status: 500 }
    );
  }
}
