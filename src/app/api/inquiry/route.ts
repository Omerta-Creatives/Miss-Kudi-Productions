import { NextResponse } from "next/server";
import {
  calculateProductionEstimate,
  computeDefaultSizeBreakdown,
  INITIAL_ORDERS,
  parseQuantityBracketToDefaultUnits,
  ProductionOrder,
} from "../../lib/production-os";
import {
  executeNeonSql,
  getNeonConnectionString,
  insertOrderIntoNeon,
} from "../../lib/neon-clerk";

// Server-side fallback store for API requests during runtime
const serverOrders: ProductionOrder[] = [...INITIAL_ORDERS];

export async function GET() {
  if (getNeonConnectionString()) {
    try {
      const { rows } = await executeNeonSql<Record<string, any>>(
        `SELECT * FROM production_orders ORDER BY created_at DESC LIMIT 100`
      );
      if (rows.length > 0) {
        const mapped: ProductionOrder[] = rows.map((r) => ({
          id: r.id,
          jobCode: r.job_code,
          offlineId: r.offline_id,
          branchId: r.branch_id || "BR-LOS-YABA",
          company: r.company,
          email: r.email,
          phone: r.phone || "",
          garmentCategory: r.garment_category,
          quantityBracket: r.quantity_bracket,
          exactQuantity: Number(r.exact_quantity),
          specificationsReady: r.specifications_ready,
          details: r.details || "",
          stage: r.stage,
          sizeBreakdown:
            typeof r.size_breakdown === "string"
              ? JSON.parse(r.size_breakdown)
              : r.size_breakdown,
          estimatedUnitCostNgn: Number(r.estimated_unit_cost_ngn),
          totalQuoteNgn: Number(r.total_quote_ngn),
          estimatedFabricMeters: Number(r.estimated_fabric_meters),
          estimatedLeadWeeks: Number(r.estimated_lead_weeks),
          discountPercent: Number(r.discount_percent),
          promoCode: r.promo_code || undefined,
          assignedPatternDesigner: r.assigned_pattern_designer,
          assignedTailorLead: r.assigned_tailor_lead,
          assignedQcInspector: r.assigned_qc_inspector,
          unitsSewn: Number(r.units_sewn),
          unitsPassedQc: Number(r.units_passed_qc),
          unitsRework: Number(r.units_rework),
          targetDeliveryDate: r.target_delivery_date,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        return NextResponse.json({
          ok: true,
          source: "neon_postgres_serverless",
          orders: mapped,
        });
      }
    } catch {
      // Fall back to in-memory seed orders if table not initialized yet
    }
  }

  return NextResponse.json({
    ok: true,
    source: "hybrid_edge_store",
    orders: serverOrders,
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let payload: Record<string, any> = {};

  if (contentType.includes("application/json")) {
    payload = await request.json();
  } else {
    const form = await request.formData();
    form.forEach((value, key) => {
      payload[key] = String(value);
    });
  }

  const required = ["company", "email", "garment", "quantity", "details"];
  const missing = required.filter((key) => !String(payload[key] ?? "").trim());

  if (missing.length) {
    return NextResponse.json(
      { ok: false, message: `Please complete required fields: ${missing.join(", ")}.` },
      { status: 400 }
    );
  }

  const offlineId =
    String(payload.offlineId || "").trim() ||
    `mkp-offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Idempotent deduplication by offlineId
  const existing = serverOrders.find((o) => o.offlineId === offlineId);
  if (existing) {
    return NextResponse.json({
      ok: true,
      deduplicated: true,
      message: `Production inquiry ${existing.jobCode} already registered.`,
      order: existing,
    });
  }

  const exactQuantity =
    Number(payload.exactQuantity) > 0
      ? Number(payload.exactQuantity)
      : parseQuantityBracketToDefaultUnits(String(payload.quantity));

  const specificationsReady = String(
    payload.specifications || "Designs and patterns"
  );

  const estimate = calculateProductionEstimate({
    garmentCategory: String(payload.garment),
    exactQuantity,
    specificationsReady,
    promoCode: payload.promoCode,
  });

  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = String(Math.floor(100 + Math.random() * 900));
  const jobCode = String(payload.jobCode || `MKP-${dateStamp}-${suffix}`);

  const targetDate =
    String(payload.targetDeliveryDate || "").trim() ||
    new Date(Date.now() + estimate.estimatedLeadWeeks * 7 * 86400000)
      .toISOString()
      .slice(0, 10);

  const sizeBreakdown =
    payload.sizeBreakdown && typeof payload.sizeBreakdown === "object"
      ? payload.sizeBreakdown
      : computeDefaultSizeBreakdown(exactQuantity);

  const newOrder: ProductionOrder = {
    id: `ord-${Date.now()}`,
    jobCode,
    offlineId,
    branchId: "BR-LOS-YABA",
    company: String(payload.company).trim(),
    email: String(payload.email).trim(),
    phone: String(payload.phone || "").trim(),
    garmentCategory: String(payload.garment),
    quantityBracket: String(payload.quantity),
    exactQuantity,
    specificationsReady,
    details: String(payload.details).trim(),
    stage: "01_brief",
    sizeBreakdown,
    estimatedUnitCostNgn: estimate.estimatedUnitCostNgn,
    totalQuoteNgn: estimate.totalQuoteNgn,
    estimatedFabricMeters: estimate.estimatedFabricMeters,
    estimatedLeadWeeks: estimate.estimatedLeadWeeks,
    discountPercent: estimate.combinedDiscountPercent,
    promoCode: estimate.promoApplied,
    assignedPatternDesigner: estimate.assignedPatternDesigner,
    assignedTailorLead: estimate.assignedTailorLead,
    assignedQcInspector: estimate.assignedQcInspector,
    unitsSewn: 0,
    unitsPassedQc: 0,
    unitsRework: 0,
    targetDeliveryDate: targetDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  serverOrders.unshift(newOrder);

  let persistedToNeon = false;
  try {
    persistedToNeon = await insertOrderIntoNeon(newOrder);
  } catch {
    persistedToNeon = false;
  }

  return NextResponse.json(
    {
      ok: true,
      persistedToNeon,
      message: `Production Brief ${newOrder.jobCode} logged and assigned to ${newOrder.assignedPatternDesigner} (Pattern Studio).`,
      order: newOrder,
    },
    { status: 201 }
  );
}
