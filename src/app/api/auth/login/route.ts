import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  ensureAuthSchemaInNeon,
  guardSameOriginMutation,
  LOCKOUT_DURATION_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  verifyPasswordHash,
  verifySeededDefaultPassword,
} from "../../../lib/auth-server";
import { executeNeonSql, getNeonConnectionString } from "../../../lib/neon-clerk";
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
    const password = String(body.password || "");
    const rememberMe = Boolean(body.rememberMe);
    const fallbackAccount = body.fallbackAccount as ArtisanStaff | undefined;
    const fallbackPasswordHash = body.fallbackPasswordHash as string | undefined;

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid work email address." },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { ok: false, error: "Please enter your password." },
        { status: 400 }
      );
    }

    let matchedUser: ArtisanStaff | null = null;
    let dbPasswordHash: string | null = null;
    let failedAttempts = 0;
    let lockedUntil: string | null = null;
    let neonReachable = false;

    if (getNeonConnectionString()) {
      try {
        await ensureAuthSchemaInNeon();
        const { rows } = await executeNeonSql<Record<string, any>>(
          `SELECT
            id, name, email, password_hash, failed_login_attempts, locked_until,
            access_tier, artisan_role, branch_id, branch_name, specialty, station,
            active_runs, units_completed_month, qc_pass_rate, shift_status, floor_status
           FROM staff_users
           WHERE LOWER(email) = $1
           LIMIT 1`,
          [cleanEmail]
        );
        neonReachable = true;

        if (rows.length > 0) {
          const r = rows[0];
          dbPasswordHash = r.password_hash ? String(r.password_hash) : null;
          failedAttempts = Number(r.failed_login_attempts ?? 0);
          lockedUntil = r.locked_until ? String(r.locked_until) : null;
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
        }
      } catch {
        neonReachable = false;
      }
    }

    // Fallback to seeded accounts or client-provisioned roster if not yet synced to Neon
    if (!matchedUser) {
      const seedMatch = INITIAL_ARTISANS.find(
        (a) => a.email.toLowerCase() === cleanEmail
      );
      if (seedMatch) {
        matchedUser = seedMatch;
      } else if (
        fallbackAccount &&
        fallbackAccount.email?.toLowerCase() === cleanEmail
      ) {
        matchedUser = fallbackAccount;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No provisioned factory account matches that email. Contact Superadmin HQ or your Plant Admin to be onboarded.",
        },
        { status: 401 }
      );
    }

    // Enforce temporary account lockout after repeated failed attempts
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000)
      );
      return NextResponse.json(
        {
          ok: false,
          locked: true,
          error: `Account temporarily locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed sign-in attempts. Try again in ${minutesLeft} min or use Forgot Password to unlock immediately.`,
        },
        { status: 429 }
      );
    }

    // Verify password:
    // 1. Custom PBKDF2 hash stored in Neon DB
    // 2. Hybrid local PBKDF2 hash (for offline-provisioned or offline-reset accounts)
    // 3. Seeded default credentials (when no custom password hash exists yet)
    let passwordValid = false;
    const effectiveHash = dbPasswordHash || fallbackPasswordHash || null;

    if (effectiveHash) {
      passwordValid = await verifyPasswordHash(password, effectiveHash);
    } else {
      passwordValid = verifySeededDefaultPassword(cleanEmail, password);
    }

    if (!passwordValid) {
      if (neonReachable) {
        const nextFailed = failedAttempts + 1;
        const shouldLock = nextFailed >= MAX_FAILED_LOGIN_ATTEMPTS;
        const lockTimestamp = shouldLock
          ? new Date(
              Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            ).toISOString()
          : null;
        await executeNeonSql(
          `UPDATE staff_users
           SET failed_login_attempts = $2,
               locked_until = $3
           WHERE LOWER(email) = $1`,
          [cleanEmail, nextFailed, lockTimestamp]
        ).catch(() => {});

        const remaining = Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - nextFailed);
        return NextResponse.json(
          {
            ok: false,
            error: shouldLock
              ? `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes — use Reset Password to unlock.`
              : `Incorrect password for ${cleanEmail}. ${remaining} attempt${
                  remaining === 1 ? "" : "s"
                } remaining before temporary lockout.`,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: effectiveHash
            ? `Incorrect password for ${cleanEmail}. Use Forgot Password if you need to reset it.`
            : verifySeededDefaultPassword(cleanEmail, "__probe__") ||
              cleanEmail === "kudi@kproductions.com" ||
              cleanEmail === "demolablaze@gmail.com"
            ? `Incorrect password for ${cleanEmail}.`
            : `No password has been set for ${cleanEmail} yet. Click "Forgot password?" to set your password in 60 seconds.`,
        },
        { status: 401 }
      );
    }

    // Password verified — mint signed session token & cookie
    const { token, payload } = await createSessionToken(
      matchedUser,
      rememberMe
    );
    const expiresAtIso = new Date(payload.exp * 1000).toISOString();

    if (neonReachable) {
      await executeNeonSql(
        `UPDATE staff_users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_login_at = NOW()
         WHERE LOWER(email) = $1`,
        [cleanEmail]
      ).catch(() => {});

      await executeNeonSql(
        `INSERT INTO auth_sessions (
          id, user_id, email, access_tier, remember_me, user_agent, expires_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          payload.sid,
          matchedUser.id,
          matchedUser.email,
          matchedUser.accessTier,
          rememberMe,
          (request.headers.get("user-agent") || "").slice(0, 250),
          expiresAtIso,
        ]
      ).catch(() => {});

      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "auth.sign_in",
          matchedUser.name,
          matchedUser.accessTier.toUpperCase(),
          matchedUser.email,
          `Signed in to Operations OS (${
            rememberMe ? "30-day Remember Me workstation" : "8-hour floor shift"
          }).`,
        ]
      ).catch(() => {});
    }

    const response = NextResponse.json({
      ok: true,
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
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Authentication failed." },
      { status: 500 }
    );
  }
}
