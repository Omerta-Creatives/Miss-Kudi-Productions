import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSessionToken,
  ensureAuthSchema,
  guardSameOriginMutation,
  LOCKOUT_DURATION_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  verifyPasswordHash,
  verifySeededDefaultPassword,
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
  normalizeArtisanRecord,
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
    RATE_LIMIT_PROFILES.authLoginIp,
    undefined,
    "Too many sign-in attempts from this network. Please wait a moment and try again."
  );
  if (ipCheck.blocked) return ipCheck.blocked;

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
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "Please enter a valid work email address." },
          { status: 400 }
        ),
        ipCheck.result
      );
    }

    const accountCheck = enforceRequestRateLimit(
      request,
      RATE_LIMIT_PROFILES.authLoginAccount,
      cleanEmail,
      "Too many sign-in attempts for this account. Please wait 60 seconds before trying again."
    );
    if (accountCheck.blocked) return accountCheck.blocked;

    if (!password) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "Please enter your password." },
          { status: 400 }
        ),
        accountCheck.result
      );
    }

    let matchedUser: ArtisanStaff | null = null;
    let dbPasswordHash: string | null = null;
    let failedAttempts = 0;
    let lockedUntil: string | null = null;
    let dbReachable = false;

    if (getDatabaseConnectionString()) {
      try {
        await ensureAuthSchema();
        const { rows } = await executeSqlQuery<Record<string, any>>(
          `SELECT
            id, name, email, password_hash, failed_login_attempts, locked_until,
            access_tier, artisan_role, branch_id, branch_name, specialty, station,
            active_runs, units_completed_month, qc_pass_rate, shift_status, floor_status
           FROM staff_users
           WHERE LOWER(email) = $1
           LIMIT 1`,
          [cleanEmail]
        );
        dbReachable = true;

        if (rows.length > 0) {
          const r = rows[0];
          dbPasswordHash = r.password_hash ? String(r.password_hash) : null;
          failedAttempts = Number(r.failed_login_attempts ?? 0);
          lockedUntil = r.locked_until ? String(r.locked_until) : null;
          matchedUser = normalizeArtisanRecord({
            id: String(r.id),
            name: String(r.name),
            email: String(r.email).toLowerCase(),
            accessTier: (r.access_tier as UserAccessTier) || "staff",
            role: (r.artisan_role as ArtisanRole) || "tailor",
            branchId: String(r.branch_id || INITIAL_BRANCHES[0].id),
            branchName: String(r.branch_name || INITIAL_BRANCHES[0].name),
            specialty: sanitizeSpecialtyText(String(r.specialty || "")),
            station: String(r.station || "Main Factory Floor, Surulere"),
            activeRuns: Number(r.active_runs ?? 0),
            unitsCompletedMonth: Number(r.units_completed_month ?? 0),
            qcPassRate: Number(r.qc_pass_rate ?? 99.0),
            shiftStatus:
              r.shift_status === "OFF_SHIFT" ? "OFF_SHIFT" : "CLOCKED_IN",
            status:
              (r.floor_status as ArtisanStaff["status"]) || "Active on Floor",
          });
        }
      } catch {
        dbReachable = false;
      }
    }

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
        matchedUser = {
          ...fallbackAccount,
          specialty: sanitizeSpecialtyText(fallbackAccount.specialty),
        };
      }
    }

    if (!matchedUser) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error:
              "No provisioned factory account matches that email. Contact your Plant Admin or Superadmin HQ to be onboarded.",
          },
          { status: 401 }
        ),
        accountCheck.result
      );
    }

    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000)
      );
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            locked: true,
            error: `Account temporarily locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed sign-in attempts. Try again in ${minutesLeft} min or use Forgot Password to unlock immediately.`,
          },
          { status: 429 }
        ),
        accountCheck.result
      );
    }

    let passwordValid = false;
    const effectiveHash = dbPasswordHash || fallbackPasswordHash || null;

    if (effectiveHash) {
      passwordValid = await verifyPasswordHash(password, effectiveHash);
    } else {
      passwordValid = verifySeededDefaultPassword(cleanEmail, password);
    }

    if (!passwordValid) {
      if (dbReachable) {
        const nextFailed = failedAttempts + 1;
        const shouldLock = nextFailed >= MAX_FAILED_LOGIN_ATTEMPTS;
        const lockTimestamp = shouldLock
          ? new Date(
              Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            ).toISOString()
          : null;
        await executeSqlQuery(
          `UPDATE staff_users
           SET failed_login_attempts = $2,
               locked_until = $3
           WHERE LOWER(email) = $1`,
          [cleanEmail, nextFailed, lockTimestamp]
        ).catch(() => {});

        const remaining = Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - nextFailed);
        return attachRateLimitHeaders(
          NextResponse.json(
            {
              ok: false,
              error: shouldLock
                ? `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes — use Reset Password to unlock.`
                : `Incorrect password for ${cleanEmail}. ${remaining} attempt${
                    remaining === 1 ? "" : "s"
                  } remaining before temporary lockout.`,
            },
            { status: 401 }
          ),
          accountCheck.result
        );
      }

      return attachRateLimitHeaders(
        NextResponse.json(
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
        ),
        accountCheck.result
      );
    }

    const { token, payload } = await createSessionToken(
      matchedUser,
      rememberMe
    );
    const expiresAtIso = new Date(payload.exp * 1000).toISOString();

    if (dbReachable) {
      await executeSqlQuery(
        `UPDATE staff_users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_login_at = NOW()
         WHERE LOWER(email) = $1`,
        [cleanEmail]
      ).catch(() => {});

      await executeSqlQuery(
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

      await executeSqlQuery(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "auth.sign_in",
          matchedUser.name,
          matchedUser.accessTier.toUpperCase(),
          matchedUser.email,
          `Signed in to Miss Kudi Productions (${
            rememberMe ? "30-day workstation session" : "8-hour floor shift"
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
    return attachRateLimitHeaders(response, accountCheck.result);
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          error: err?.message || "Authentication error. Please try again.",
        },
        { status: 500 }
      ),
      ipCheck.result
    );
  }
}
