import { NextRequest, NextResponse } from "next/server";
import {
  createResetOtpChallenge,
  ensureAuthSchema,
  guardSameOriginMutation,
  RESET_CODE_TTL_SECONDS,
} from "../../../lib/auth-server";
import {
  executeSqlQuery,
  getDatabaseConnectionString,
} from "../../../lib/database";
import { INITIAL_ARTISANS } from "../../../lib/production-os";
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
    "Too many password recovery requests. Please wait a few minutes before requesting another code."
  );
  if (ipCheck.blocked) return ipCheck.blocked;

  try {
    const body = await request.json();
    const cleanEmail = String(body.email || "")
      .trim()
      .toLowerCase();
    const knownClientAccount = Boolean(body.knownClientAccount);

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "Please enter a valid factory work email address." },
          { status: 400 }
        ),
        ipCheck.result
      );
    }

    const accountCheck = enforceRequestRateLimit(
      request,
      RATE_LIMIT_PROFILES.authRecoveryAccount,
      cleanEmail,
      "Too many verification codes requested for this email. Please wait 15 minutes before trying again."
    );
    if (accountCheck.blocked) return accountCheck.blocked;

    let accountExists = INITIAL_ARTISANS.some(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    let accountName =
      INITIAL_ARTISANS.find((a) => a.email.toLowerCase() === cleanEmail)?.name ||
      "Factory Operator";

    if (getDatabaseConnectionString()) {
      try {
        await ensureAuthSchema();
        const { rows } = await executeSqlQuery<{ id: string; name: string }>(
          `SELECT id, name FROM staff_users WHERE LOWER(email) = $1 LIMIT 1`,
          [cleanEmail]
        );
        if (rows.length > 0) {
          accountExists = true;
          accountName = rows[0].name;
        }
      } catch {
        // Fallback to seeded / client roster check
      }
    }

    if (!accountExists && knownClientAccount) {
      accountExists = true;
    }

    if (!accountExists) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error: `No provisioned account found for "${cleanEmail}". Contact your Plant Admin or Superadmin HQ to be added to the roster first.`,
          },
          { status: 404 }
        ),
        accountCheck.result
      );
    }

    const { code, codeHash, expiresAtMs, resetChallenge } =
      await createResetOtpChallenge(cleanEmail);
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    if (getDatabaseConnectionString()) {
      try {
        await ensureAuthSchema();
        await executeSqlQuery(
          `INSERT INTO password_reset_tokens (id, email, code_hash, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [
            `rst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            cleanEmail,
            codeHash,
            expiresAtIso,
          ]
        );
        await executeSqlQuery(
          `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            `aud-${Date.now()}`,
            "auth.password_reset_requested",
            accountName,
            "Identity Recovery",
            cleanEmail,
            `Issued 15-minute 6-digit password reset verification code for ${cleanEmail}.`,
          ]
        );
      } catch {
        // Continue with stateless HMAC challenge seal
      }
    }

    let hostDomain = "localhost";
    try {
      hostDomain = new URL(request.url).hostname || "localhost";
    } catch {
      hostDomain = "localhost";
    }

    const originBoundMessage = `Your Miss Kudi Productions verification code is ${code}. Valid for 15 minutes.\n\n@${hostDomain} #${code}`;

    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        email: cleanEmail,
        expiresInMinutes: Math.round(RESET_CODE_TTL_SECONDS / 60),
        expiresAt: expiresAtIso,
        resetChallenge,
        message: `Sent a 6-digit verification code for ${cleanEmail} (valid for 15 minutes).`,
        dispatchPreview: !process.env.RESEND_API_KEY
          ? {
              otpCode: code,
              originBoundSmsSample: originBoundMessage,
            }
          : undefined,
      }),
      accountCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          error: err?.message || "Unable to issue password reset code.",
        },
        { status: 500 }
      ),
      ipCheck.result
    );
  }
}
