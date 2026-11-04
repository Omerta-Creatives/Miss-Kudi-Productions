import { NextResponse } from "next/server";
import { executeNeonSql, getNeonConnectionString } from "../../../lib/neon-clerk";
import { FactoryBranch, INITIAL_BRANCHES } from "../../../lib/production-os";

export async function GET() {
  try {
    if (!getNeonConnectionString()) {
      return NextResponse.json({
        ok: true,
        source: "hybrid_edge",
        branches: INITIAL_BRANCHES,
      });
    }

    const { rows } = await executeNeonSql<Record<string, any>>(
      `SELECT
        id, name, location, specialization, machine_count, staff_count,
        fabric_meters_stock, net_revenue_ngn, operating_expenses_ngn, true_net_profit_ngn, status
       FROM factory_branches
       ORDER BY created_at ASC`
    );

    const branches: FactoryBranch[] = rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      location: String(r.location),
      specialization: String(r.specialization),
      machineCount: Number(r.machine_count ?? 24),
      staffCount: Number(r.staff_count ?? 6),
      fabricMetersStock: Number(r.fabric_meters_stock ?? 1000),
      netRevenueNgn: Number(r.net_revenue_ngn ?? 0),
      operatingExpensesNgn: Number(r.operating_expenses_ngn ?? 0),
      trueNetProfitNgn: Number(r.true_net_profit_ngn ?? 0),
      status: r.status === "MAINTENANCE" ? "MAINTENANCE" : "ACTIVE",
    }));

    return NextResponse.json({
      ok: true,
      source: "neon_postgres",
      branches,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load branches.",
        branches: INITIAL_BRANCHES,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      location,
      specialization = "Bulk Apparel Sewing, Cutting & Quality Control",
      machineCount = 24,
      staffCount = 1,
      fabricMetersStock = 1000,
      netRevenueNgn = 0,
      operatingExpensesNgn = 0,
      trueNetProfitNgn = 0,
      status = "ACTIVE",
      actor = "Superadmin HQ",
    } = body;

    if (!name || !location) {
      return NextResponse.json(
        { ok: false, error: "Branch name and location are required." },
        { status: 400 }
      );
    }

    const branchId = id || `br-${Date.now()}`;

    if (getNeonConnectionString()) {
      await executeNeonSql(
        `INSERT INTO factory_branches (
          id, name, location, specialization, machine_count, staff_count,
          fabric_meters_stock, net_revenue_ngn, operating_expenses_ngn, true_net_profit_ngn, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          specialization = EXCLUDED.specialization,
          machine_count = EXCLUDED.machine_count,
          fabric_meters_stock = EXCLUDED.fabric_meters_stock,
          status = EXCLUDED.status`,
        [
          branchId,
          name.trim(),
          location.trim(),
          specialization.trim(),
          Number(machineCount) || 24,
          Number(staffCount) || 1,
          Number(fabricMetersStock) || 1000,
          Number(netRevenueNgn) || 0,
          Number(operatingExpensesNgn) || 0,
          Number(trueNetProfitNgn) || 0,
          status,
        ]
      );

      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "facility.provisioned",
          actor,
          "Superadmin HQ",
          name.trim(),
          `Provisioned factory branch "${name.trim()}" (${location.trim()}) with ${machineCount} industrial machines.`,
        ]
      );
    }

    return NextResponse.json({ ok: true, id: branchId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create branch." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      location,
      specialization,
      machineCount,
      staffCount,
      fabricMetersStock,
      netRevenueNgn,
      operatingExpensesNgn,
      trueNetProfitNgn,
      status,
      actor = "Superadmin HQ",
    } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Branch id is required." },
        { status: 400 }
      );
    }

    if (getNeonConnectionString()) {
      await executeNeonSql(
        `UPDATE factory_branches
         SET
           name = COALESCE($2, name),
           location = COALESCE($3, location),
           specialization = COALESCE($4, specialization),
           machine_count = COALESCE($5, machine_count),
           staff_count = COALESCE($6, staff_count),
           fabric_meters_stock = COALESCE($7, fabric_meters_stock),
           net_revenue_ngn = COALESCE($8, net_revenue_ngn),
           operating_expenses_ngn = COALESCE($9, operating_expenses_ngn),
           true_net_profit_ngn = COALESCE($10, true_net_profit_ngn),
           status = COALESCE($11, status)
         WHERE id = $1`,
        [
          id,
          name ?? null,
          location ?? null,
          specialization ?? null,
          machineCount !== undefined ? Number(machineCount) : null,
          staffCount !== undefined ? Number(staffCount) : null,
          fabricMetersStock !== undefined ? Number(fabricMetersStock) : null,
          netRevenueNgn !== undefined ? Number(netRevenueNgn) : null,
          operatingExpensesNgn !== undefined ? Number(operatingExpensesNgn) : null,
          trueNetProfitNgn !== undefined ? Number(trueNetProfitNgn) : null,
          status ?? null,
        ]
      );

      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "facility.updated",
          actor,
          "Superadmin HQ",
          name || id,
          `Updated facility branch "${name || id}".`,
        ]
      );
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update branch." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    const actor = searchParams.get("actor") || "Superadmin HQ";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Branch id is required." },
        { status: 400 }
      );
    }

    if (getNeonConnectionString()) {
      await executeNeonSql(`DELETE FROM factory_branches WHERE id = $1`, [id]);
      await executeNeonSql(
        `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          `aud-${Date.now()}`,
          "facility.deleted",
          actor,
          "Superadmin HQ",
          id,
          `Deleted factory branch (${id}).`,
        ]
      );
    }

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete branch." },
      { status: 500 }
    );
  }
}
