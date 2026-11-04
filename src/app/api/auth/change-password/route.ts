import { NextRequest, NextResponse } from "next/server";
import {
  ensureAuthSchemaInNeon,
  extractSessionTokenFromRequest,
  guardSameOriginMutation,
  hashPassword,
  validatePasswordStrength,
  verifyPasswordHash,
  verifySeededDefaultPassword,
  verifySessionToken,
} from "../../../lib/auth-server";
import { executeNeonSql, getNeonConnectionString } from "../../../lib/neon-clerk";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rawToken = extractSessionTokenFromRequest(request);
  const actorSession = await verifySessionToken(rawToken);
  if (!actorSession) {
    return NextResponse.json(
      { ok: false, error: "Active authenticated session required." },
      { status: 401 }
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
        return NextResponse.json(
          { ok: false, error: "Floor staff can only change their own password." },
          { status: 403 }
        );
      }
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json(
        { ok: false, error: strengthError },
        { status: 400 }
      );
    }

    let existingDbHash: string | null = null;
    let targetTier = "staff";

    if (getNeonConnectionString()) {
      try {
        await ensureAuthSchemaInNeon();
        const { rows } = await executeNeonSql<{
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

    // Prevent non-superadmin from overwriting a superadmin's password
    if (
      !isSelf &&
      targetTier === "superadmin" &&
      actorSession.accessTier !== "superadmin"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only Superadmin HQ can update a Superadmin password.",
        },
        { status: 403 }
      );
    }

    // When changing own password, verify currentPassword first
    if (isSelf) {
      if (!currentPassword) {
        return NextResponse.json(
          { ok: false, error: "Please enter your current password." },
          { status: 400 }
        );
      }
      const effectiveHash = existingDbHash || fallbackPasswordHash || null;
      const currentValid = effectiveHash
        ? await verifyPasswordHash(currentPassword, effectiveHash)
        : verifySeededDefaultPassword(targetEmail, currentPassword);

      if (!currentValid) {
        return NextResponse.json(
          { ok: false, error: "Your current password is incorrect." },
          { status: 401 }
        );
      }
    }

    const nextHash = await hashPassword(newPassword);

    if (getNeonConnectionString()) {
      try {
        await ensureAuthSchemaInNeon();
        await executeNeonSql(
          `UPDATE staff_users
           SET password_hash = $2,
               must_reset_password = FALSE,
               failed_login_attempts = 0,
               locked_until = NULL,
               password_changed_at = NOW()
           WHERE LOWER(email) = $1`,
          [targetEmail, nextHash]
        );
        await executeNeonSql(
          `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            `aud-${Date.now()}`,
            isSelf ? "auth.password_changed" : "rbac.password_reset_by_admin",
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

    return NextResponse.json({
      ok: true,
      targetEmail,
      passwordHash: nextHash,
      message: isSelf
        ? "Your password has been updated."
        : `Password updated for ${targetEmail}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unable to update password." },
      { status: 500 }
    );
  }
}
