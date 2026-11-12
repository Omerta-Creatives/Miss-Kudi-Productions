import { NextRequest, NextResponse } from "next/server";
import {
  executeSqlQuery,
  getDatabaseConnectionString,
} from "../../../lib/database";
import {
  ensureAuthSchema,
  guardSameOriginMutation,
  hashPassword,
  requireAuthenticatedSession,
} from "../../../lib/auth-server";
import {
  ArtisanRole,
  ArtisanStaff,
  INITIAL_ARTISANS,
  INITIAL_BRANCHES,
  normalizeArtisanRecord,
  normalizeBranchId,
  normalizeBranchName,
  sanitizeSpecialtyText,
  SURULERE_BRANCH_ID,
  SURULERE_BRANCH_NAME,
  UserAccessTier,
} from "../../../lib/production-os";
import {
  attachRateLimitHeaders,
  enforceRequestRateLimit,
  RATE_LIMIT_PROFILES,
} from "../../../lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.adminRead
  );
  if (rateCheck.blocked) return rateCheck.blocked;

  const auth = await requireAuthenticatedSession(request, [
    "superadmin",
    "admin",
    "staff",
  ]);
  if (auth.denied) return attachRateLimitHeaders(auth.denied, rateCheck.result);

  try {
    if (!getDatabaseConnectionString()) {
      return attachRateLimitHeaders(
        NextResponse.json({
          ok: true,
          source: "local_hybrid",
          users: INITIAL_ARTISANS,
        }),
        rateCheck.result
      );
    }

    const { rows } = await executeSqlQuery<Record<string, any>>(
      `SELECT
        id, name, email, access_tier, artisan_role,
        branch_id, branch_name, specialty, station, active_runs,
        units_completed_month, qc_pass_rate, shift_status, floor_status
       FROM staff_users
       ORDER BY
         CASE access_tier
           WHEN 'superadmin' THEN 1
           WHEN 'admin' THEN 2
           ELSE 3
         END,
         created_at DESC`
    );

    const users: ArtisanStaff[] = rows.map((r) =>
      normalizeArtisanRecord({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        accessTier: (r.access_tier as UserAccessTier) || "staff",
        role: (r.artisan_role as ArtisanRole) || "tailor",
        branchId: String(r.branch_id || INITIAL_BRANCHES[0].id),
        branchName: String(r.branch_name || INITIAL_BRANCHES[0].name),
        specialty: sanitizeSpecialtyText(String(r.specialty || "")),
        station: String(r.station || "Main Floor, Surulere"),
        activeRuns: Number(r.active_runs ?? 0),
        unitsCompletedMonth: Number(r.units_completed_month ?? 0),
        qcPassRate: Number(r.qc_pass_rate ?? 99.0),
        shiftStatus: r.shift_status === "OFF_SHIFT" ? "OFF_SHIFT" : "CLOCKED_IN",
        status:
          (r.floor_status as ArtisanStaff["status"]) || "Active on Floor",
      })
    );

    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        source: "postgresql",
        users,
      }),
      rateCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          error: err?.message || "Failed to load team accounts.",
          users: INITIAL_ARTISANS,
        },
        { status: 200 }
      ),
      rateCheck.result
    );
  }
}

export async function POST(request: Request) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rateCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.adminWrite
  );
  if (rateCheck.blocked) return rateCheck.blocked;

  const auth = await requireAuthenticatedSession(request, [
    "superadmin",
    "admin",
  ]);
  if (auth.denied) return attachRateLimitHeaders(auth.denied, rateCheck.result);

  try {
    const body = await request.json();
    const {
      id,
      name,
      email,
      password,
      accessTier = "staff",
      role = "tailor",
      branchId = SURULERE_BRANCH_ID,
      branchName = SURULERE_BRANCH_NAME,
      specialty = "Garment Production Specialist",
      station = "Main Factory Floor, Surulere",
      activeRuns = 1,
      unitsCompletedMonth = 0,
      qcPassRate = 99.0,
      shiftStatus = "CLOCKED_IN",
      status = "Active on Floor",
      actor = auth.session.name,
    } = body;

    if (
      accessTier === "superadmin" &&
      auth.session.accessTier !== "superadmin"
    ) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error: "Only Superadmin HQ can provision a Superadmin account.",
          },
          { status: 403 }
        ),
        rateCheck.result
      );
    }

    if (!name || !email) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "Name and email are required." },
          { status: 400 }
        ),
        rateCheck.result
      );
    }

    const userId = id || `art-${Date.now()}`;
    const resolvedBranchId = normalizeBranchId(branchId);
    const resolvedBranchName = normalizeBranchName(branchName);
    const passwordHash =
      password && String(password).length >= 6
        ? await hashPassword(String(password))
        : null;
    const cleanSpecialty = sanitizeSpecialtyText(specialty);

    if (getDatabaseConnectionString()) {
      await ensureAuthSchema();
      await executeSqlQuery(
        `INSERT INTO staff_users (
          id, name, email, password_hash, access_tier, artisan_role,
          branch_id, branch_name, specialty, station, active_runs,
          units_completed_month, qc_pass_rate, shift_status, floor_status, password_changed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, CASE WHEN $4 IS NOT NULL THEN NOW() ELSE NULL END)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = COALESCE(EXCLUDED.password_hash, staff_users.password_hash),
          password_changed_at = CASE WHEN EXCLUDED.password_hash IS NOT NULL THEN NOW() ELSE staff_users.password_changed_at END,
          access_tier = EXCLUDED.access_tier,
          artisan_role = EXCLUDED.artisan_role,
          branch_name = EXCLUDED.branch_name,
          specialty = EXCLUDED.specialty,
          station = EXCLUDED.station,
          shift_status = EXCLUDED.shift_status,
          floor_status = EXCLUDED.floor_status`,
        [
          userId,
          name.trim(),
          email.trim().toLowerCase(),
          passwordHash,
          accessTier,
          role,
          null,
          resolvedBranchName,
          cleanSpecialty,
          station,
          Number(activeRuns) || 0,
          Number(unitsCompletedMonth) || 0,
          Number(qcPassRate) || 99.0,
          shiftStatus,
          status,
        ]
      );

      await executeSqlQuery(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "team.user_created",
          actor,
          auth.session.accessTier.toUpperCase(),
          email.trim().toLowerCase(),
          `Added ${accessTier.toUpperCase()} account for ${name.trim()} (${role}) at ${resolvedBranchName}.`,
        ]
      );
    }

    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        passwordHash,
        user: {
          id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          accessTier,
          role,
          branchId: resolvedBranchId,
          branchName: resolvedBranchName,
          specialty: cleanSpecialty,
          station,
          activeRuns: Number(activeRuns) || 0,
          unitsCompletedMonth: Number(unitsCompletedMonth) || 0,
          qcPassRate: Number(qcPassRate) || 99.0,
          shiftStatus,
          status,
        },
      }),
      rateCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { ok: false, error: err?.message || "Failed to create account." },
        { status: 500 }
      ),
      rateCheck.result
    );
  }
}

export async function PUT(request: Request) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rateCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.adminWrite
  );
  if (rateCheck.blocked) return rateCheck.blocked;

  const auth = await requireAuthenticatedSession(request, [
    "superadmin",
    "admin",
  ]);
  if (auth.denied) return attachRateLimitHeaders(auth.denied, rateCheck.result);

  try {
    const body = await request.json();
    const {
      id,
      name,
      email,
      password,
      accessTier,
      role,
      branchId,
      branchName,
      specialty,
      station,
      activeRuns,
      unitsCompletedMonth,
      qcPassRate,
      shiftStatus,
      status,
      actor = auth.session.name,
    } = body;

    if (
      accessTier === "superadmin" &&
      auth.session.accessTier !== "superadmin"
    ) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            error: "Only Superadmin HQ can promote an account to Superadmin.",
          },
          { status: 403 }
        ),
        rateCheck.result
      );
    }

    if (!id && !email) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "User id or email is required for update." },
          { status: 400 }
        ),
        rateCheck.result
      );
    }

    const passwordHash =
      password && String(password).length >= 6
        ? await hashPassword(String(password))
        : null;

    if (getDatabaseConnectionString()) {
      await ensureAuthSchema();
      await executeSqlQuery(
        `UPDATE staff_users
         SET
           name = COALESCE($2, name),
           email = COALESCE($3, email),
           access_tier = COALESCE($4, access_tier),
           artisan_role = COALESCE($5, artisan_role),
           branch_name = COALESCE($6, branch_name),
           specialty = COALESCE($7, specialty),
           station = COALESCE($8, station),
           active_runs = COALESCE($9, active_runs),
           units_completed_month = COALESCE($10, units_completed_month),
           qc_pass_rate = COALESCE($11, qc_pass_rate),
           shift_status = COALESCE($12, shift_status),
           floor_status = COALESCE($13, floor_status),
           password_hash = COALESCE($14, password_hash),
           password_changed_at = CASE WHEN $14 IS NOT NULL THEN NOW() ELSE password_changed_at END,
           failed_login_attempts = CASE WHEN $14 IS NOT NULL THEN 0 ELSE failed_login_attempts END,
           locked_until = CASE WHEN $14 IS NOT NULL THEN NULL ELSE locked_until END
         WHERE id = $1 OR email = $3`,
        [
          id || "",
          name ?? null,
          email ? email.trim().toLowerCase() : null,
          accessTier ?? null,
          role ?? null,
          branchName ?? null,
          specialty !== undefined ? sanitizeSpecialtyText(specialty) : null,
          station ?? null,
          activeRuns !== undefined ? Number(activeRuns) : null,
          unitsCompletedMonth !== undefined ? Number(unitsCompletedMonth) : null,
          qcPassRate !== undefined ? Number(qcPassRate) : null,
          shiftStatus ?? null,
          status ?? null,
          passwordHash,
        ]
      );

      await executeSqlQuery(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "team.user_updated",
          actor,
          auth.session.accessTier.toUpperCase(),
          email || id,
          `Updated account ${name || email || id} (Tier: ${accessTier || "unchanged"}, Role: ${role || "unchanged"}${passwordHash ? ", Password updated" : ""}).`,
        ]
      );
    }

    return attachRateLimitHeaders(
      NextResponse.json({ ok: true, id, branchId, passwordHash }),
      rateCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { ok: false, error: err?.message || "Failed to update account." },
        { status: 500 }
      ),
      rateCheck.result
    );
  }
}

export async function DELETE(request: Request) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rateCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.adminWrite
  );
  if (rateCheck.blocked) return rateCheck.blocked;

  const auth = await requireAuthenticatedSession(request, [
    "superadmin",
    "admin",
  ]);
  if (auth.denied) return attachRateLimitHeaders(auth.denied, rateCheck.result);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    const email = searchParams.get("email") || "";
    const actor = searchParams.get("actor") || auth.session.name;

    if (!id && !email) {
      return attachRateLimitHeaders(
        NextResponse.json(
          { ok: false, error: "id or email query param required." },
          { status: 400 }
        ),
        rateCheck.result
      );
    }

    if (getDatabaseConnectionString()) {
      await executeSqlQuery(
        `DELETE FROM staff_users WHERE id = $1 OR email = $2`,
        [id, email.trim().toLowerCase()]
      );

      await executeSqlQuery(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "team.user_deleted",
          actor,
          auth.session.accessTier.toUpperCase(),
          email || id,
          `Revoked and deleted account (${email || id}).`,
        ]
      );
    }

    return attachRateLimitHeaders(
      NextResponse.json({ ok: true, deletedId: id, deletedEmail: email }),
      rateCheck.result
    );
  } catch (err: any) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { ok: false, error: err?.message || "Failed to delete account." },
        { status: 500 }
      ),
      rateCheck.result
    );
  }
}
