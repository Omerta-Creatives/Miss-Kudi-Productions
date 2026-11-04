import { NextRequest, NextResponse } from "next/server";
import {
  createResetOtpChallenge,
  ensureAuthSchemaInNeon,
  guardSameOriginMutation,
  RESET_CODE_TTL_SECONDS,
} from "../../../lib/auth-server";
import { executeNeonSql, getNeonConnectionString } from "../../../lib/neon-clerk";
import { INITIAL_ARTISANS } from "../../../lib/production-os";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const cleanEmail = String(body.email || "")
      .trim()
      .toLowerCase();
    const knownClientAccount = Boolean(body.knownClientAccount);

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid factory work email address." },
        { status: 400 }
      );
    }

    let accountExists = INITIAL_ARTISANS.some(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    let accountName =
      INITIAL_ARTISANS.find((a) => a.email.toLowerCase() === cleanEmail)?.name ||
      "Factory Operator";

    if (getNeonConnectionString()) {
      try {
        await ensureAuthSchemaInNeon();
        const { rows } = await executeNeonSql<{ id: string; name: string }>(
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
      return NextResponse.json(
        {
          ok: false,
          error: `No provisioned account found for "${cleanEmail}". Contact Superadmin HQ or your Plant Admin to be added to the roster first.`,
        },
        { status: 404 }
      );
    }

    const { code, codeHash, expiresAtMs, resetChallenge } =
      await createResetOtpChallenge(cleanEmail);
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    if (getNeonConnectionString()) {
      try {
        await ensureAuthSchemaInNeon();
        await executeNeonSql(
          `INSERT INTO password_reset_tokens (id, email, code_hash, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [
            `rst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            cleanEmail,
            codeHash,
            expiresAtIso,
          ]
        );
        await executeNeonSql(
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

    // Origin-bound SMS / OTP message format per modern-web-guidance (sms-otp-form):
    // Human-readable text first, @<domain> #<otp> on final line with no trailing text.
    const originBoundMessage = `Your Miss Kudi Productions verification code is ${code}. Valid for 15 minutes.\n\n@${hostDomain} #${code}`;

    return NextResponse.json({
      ok: true,
      email: cleanEmail,
      expiresInMinutes: Math.round(RESET_CODE_TTL_SECONDS / 60),
      expiresAt: expiresAtIso,
      resetChallenge,
      message: `Sent a 6-digit verification code for ${cleanEmail} (valid for 15 minutes).`,
      // Provided in console/atelier dispatch preview when no external SMTP gateway is wired
      dispatchPreview: !process.env.RESEND_API_KEY
        ? {
            deliveryMode: "atelier_console_dispatch",
            otpCode: code,
            originBoundSmsSample: originBoundMessage,
          }
        : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unable to initiate password reset.",
      },
      { status: 500 }
    );
  }
}
