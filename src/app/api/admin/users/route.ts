import { NextResponse } from "next/server";
import {
  executeNeonSql,
  getNeonConnectionString,
  isClerkSecretConfigured,
} from "../../../lib/neon-clerk";
import {
  ensureAuthSchemaInNeon,
  guardSameOriginMutation,
  hashPassword,
} from "../../../lib/auth-server";
import {
  ArtisanRole,
  ArtisanStaff,
  INITIAL_ARTISANS,
  INITIAL_BRANCHES,
  UserAccessTier,
} from "../../../lib/production-os";

export async function GET() {
  try {
    if (!getNeonConnectionString()) {
      return NextResponse.json({
        ok: true,
        source: "hybrid_edge",
        users: INITIAL_ARTISANS,
      });
    }

    const { rows } = await executeNeonSql<Record<string, any>>(
      `SELECT
        id, clerk_user_id, name, email, access_tier, artisan_role,
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

    const users: ArtisanStaff[] = rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      accessTier: (r.access_tier as UserAccessTier) || "staff",
      role: (r.artisan_role as ArtisanRole) || "tailor",
      branchId: String(r.branch_id || INITIAL_BRANCHES[0].id),
      branchName: String(r.branch_name || INITIAL_BRANCHES[0].name),
      specialty: String(r.specialty || ""),
      station: String(r.station || "Main Floor"),
      activeRuns: Number(r.active_runs ?? 0),
      unitsCompletedMonth: Number(r.units_completed_month ?? 0),
      qcPassRate: Number(r.qc_pass_rate ?? 99.0),
      shiftStatus: r.shift_status === "OFF_SHIFT" ? "OFF_SHIFT" : "CLOCKED_IN",
      status:
        (r.floor_status as ArtisanStaff["status"]) || "Active on Floor",
    }));

    return NextResponse.json({
      ok: true,
      source: "neon_postgres",
      users,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load RBAC users.",
        users: INITIAL_ARTISANS,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const {
      id,
      name,
      email,
      password,
      accessTier = "staff",
      role = "tailor",
      branchId = "br-yaba",
      branchName = "Yaba Flagship Production Plant",
      specialty = "Garment Production Specialist",
      station = "Main Factory Floor",
      activeRuns = 1,
      unitsCompletedMonth = 0,
      qcPassRate = 99.0,
      shiftStatus = "CLOCKED_IN",
      status = "Active on Floor",
      actor = "Superadmin HQ",
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: "Name and email are required." },
        { status: 400 }
      );
    }

    const userId = id || `art-${Date.now()}`;
    let clerkUserId: string | null = null;
    const passwordHash =
      password && String(password).length >= 6
        ? await hashPassword(String(password))
        : null;

    // Optional live Clerk user provisioning if CLERK_SECRET_KEY is configured
    if (isClerkSecretConfigured()) {
      const clerkSecret = process.env.CLERK_SECRET_KEY!.trim();
      try {
        const searchRes = await fetch(
          `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(
            email.trim().toLowerCase()
          )}`,
          {
            headers: { Authorization: `Bearer ${clerkSecret}` },
          }
        );
        if (searchRes.ok) {
          const existing = await searchRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            clerkUserId = existing[0].id;
            await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${clerkSecret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                public_metadata: {
                  accessTier,
                  specialistRole: role,
                  branchId,
                  station,
                },
              }),
            });
          } else if (password && String(password).length >= 6) {
            const parts = String(name).trim().split(/\s+/);
            const firstName = parts[0] || "Specialist";
            const lastName = parts.slice(1).join(" ") || "MKP";
            const createRes = await fetch("https://api.clerk.com/v1/users", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${clerkSecret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email_address: [email.trim().toLowerCase()],
                password: String(password),
                skip_password_checks: true,
                first_name: firstName,
                last_name: lastName,
                public_metadata: {
                  accessTier,
                  specialistRole: role,
                  branchId,
                  station,
                },
              }),
            });
            if (createRes.ok) {
              const createdClerk = await createRes.json();
              clerkUserId = createdClerk.id || null;
            }
          }
        }
      } catch {
        // Non-blocking if Clerk network call is unavailable
      }
    }

    if (getNeonConnectionString()) {
      await ensureAuthSchemaInNeon();
      await executeNeonSql(
        `INSERT INTO staff_users (
          id, clerk_user_id, name, email, password_hash, access_tier, artisan_role,
          branch_id, branch_name, specialty, station, active_runs,
          units_completed_month, qc_pass_rate, shift_status, floor_status, password_changed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, CASE WHEN $5 IS NOT NULL THEN NOW() ELSE NULL END)
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
          clerkUserId,
          name.trim(),
          email.trim().toLowerCase(),
          passwordHash,
          accessTier,
          role,
          null, // Avoid FK mismatch between local 'br-yaba' and Neon 'BR-LOS-YABA'
          branchName,
          specialty,
          station,
          Number(activeRuns) || 0,
          Number(unitsCompletedMonth) || 0,
          Number(qcPassRate) || 99.0,
          shiftStatus,
          status,
        ]
      );

      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "rbac.user_created",
          actor,
          "Superadmin / Admin CRUD",
          email.trim().toLowerCase(),
          `Provisioned ${accessTier.toUpperCase()} account for ${name.trim()} (${role}) at ${branchName}.`,
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      clerkUserId,
      passwordHash,
      user: {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        accessTier,
        role,
        branchId,
        branchName,
        specialty,
        station,
        activeRuns: Number(activeRuns) || 0,
        unitsCompletedMonth: Number(unitsCompletedMonth) || 0,
        qcPassRate: Number(qcPassRate) || 99.0,
        shiftStatus,
        status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create account." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;
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
      actor = "Superadmin HQ",
    } = body;

    if (!id && !email) {
      return NextResponse.json(
        { ok: false, error: "User id or email is required for update." },
        { status: 400 }
      );
    }

    const passwordHash =
      password && String(password).length >= 6
        ? await hashPassword(String(password))
        : null;

    if (getNeonConnectionString()) {
      await ensureAuthSchemaInNeon();
      await executeNeonSql(
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
          specialty ?? null,
          station ?? null,
          activeRuns !== undefined ? Number(activeRuns) : null,
          unitsCompletedMonth !== undefined ? Number(unitsCompletedMonth) : null,
          qcPassRate !== undefined ? Number(qcPassRate) : null,
          shiftStatus ?? null,
          status ?? null,
          passwordHash,
        ]
      );

      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "rbac.user_updated",
          actor,
          "Superadmin / Admin CRUD",
          email || id,
          `Updated account ${name || email || id} (Tier: ${accessTier || "unchanged"}, Role: ${role || "unchanged"}${passwordHash ? ", Password updated" : ""}).`,
        ]
      );
    }

    return NextResponse.json({ ok: true, id, branchId, passwordHash });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update account." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    const email = searchParams.get("email") || "";
    const actor = searchParams.get("actor") || "Superadmin HQ";

    if (!id && !email) {
      return NextResponse.json(
        { ok: false, error: "id or email query param required." },
        { status: 400 }
      );
    }

    if (getNeonConnectionString()) {
      await executeNeonSql(
        `DELETE FROM staff_users WHERE id = $1 OR email = $2`,
        [id, email.trim().toLowerCase()]
      );

      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "rbac.user_deleted",
          actor,
          "Superadmin / Admin CRUD",
          email || id,
          `Revoked and deleted account (${email || id}).`,
        ]
      );
    }

    return NextResponse.json({ ok: true, deletedId: id, deletedEmail: email });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
