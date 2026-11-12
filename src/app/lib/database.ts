import {
  INITIAL_ARTISANS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BRANCHES,
  INITIAL_EXPENSES,
  INITIAL_FABRIC_INVENTORY,
  INITIAL_ORDERS,
  normalizeBranchId,
  ProductionOrder,
  SURULERE_BRANCH_ID,
  SURULERE_BRANCH_LOCATION,
  SURULERE_BRANCH_NAME,
} from "./production-os";

export interface PlatformStatus {
  databaseConnected: boolean;
  databaseMode: "postgresql" | "local_hybrid";
  authMode: "hmac_session";
}

function isPlaceholder(val: string): boolean {
  return !val || val.includes("YOUR_") || val === "••••••••••••";
}

export function getDatabaseConnectionString(): string | null {
  const candidates = [
    process.env.DATABASE_URL?.trim(),
    process.env.POSTGRES_URL?.trim(),
    process.env.DATABASE_URL_UNPOOLED?.trim(),
    process.env.POSTGRES_URL_NON_POOLING?.trim(),
  ];
  for (const c of candidates) {
    if (
      c &&
      !isPlaceholder(c) &&
      (c.startsWith("postgres://") || c.startsWith("postgresql://"))
    ) {
      return c;
    }
  }
  return null;
}

export function getPlatformStatus(): PlatformStatus {
  const conn = getDatabaseConnectionString();
  return {
    databaseConnected: Boolean(conn),
    databaseMode: conn ? "postgresql" : "local_hybrid",
    authMode: "hmac_session",
  };
}

const SQL_CONN_HEADER = ["Neon", "Connection", "String"].join("-");
const SQL_RAW_HEADER = ["Neon", "Raw", "Text", "Output"].join("-");

/**
 * Executes parameterized SQL directly over HTTPS against the configured PostgreSQL endpoint.
 */
export async function executeSqlQuery<T = Record<string, any>>(
  query: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const conn = getDatabaseConnectionString();
  if (!conn) {
    throw new Error(
      "Database connection string (DATABASE_URL / POSTGRES_URL) is not configured."
    );
  }

  const parsed = new URL(conn);
  const endpoint = `https://${parsed.host}/sql`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SQL_CONN_HEADER]: conn,
      [SQL_RAW_HEADER]: "false",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Database SQL HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    rows: (data.rows as T[]) || [],
    rowCount: Number(data.rowCount ?? data.rows?.length ?? 0),
  };
}

/**
 * Idempotently ensures all production tables exist in PostgreSQL and seeds initial records.
 */
export async function initializeDatabaseSchemaAndSeed(): Promise<{
  synced: boolean;
  tablesCreated: string[];
  seededCounts: Record<string, number>;
}> {
  const status = getPlatformStatus();
  if (!status.databaseConnected) {
    return {
      synced: false,
      tablesCreated: [],
      seededCounts: {},
    };
  }

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS factory_branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      specialization TEXT NOT NULL,
      machine_count INTEGER NOT NULL DEFAULT 25,
      staff_count INTEGER NOT NULL DEFAULT 12,
      fabric_meters_stock INTEGER NOT NULL DEFAULT 2000,
      net_revenue_ngn BIGINT NOT NULL DEFAULT 0,
      operating_expenses_ngn BIGINT NOT NULL DEFAULT 0,
      true_net_profit_ngn BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      password_changed_at TIMESTAMPTZ,
      access_tier TEXT NOT NULL DEFAULT 'staff',
      artisan_role TEXT NOT NULL DEFAULT 'tailor',
      branch_id TEXT REFERENCES factory_branches(id) ON DELETE SET NULL,
      branch_name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      station TEXT NOT NULL,
      active_runs INTEGER NOT NULL DEFAULT 0,
      units_completed_month INTEGER NOT NULL DEFAULT 0,
      qc_pass_rate NUMERIC(5,2) NOT NULL DEFAULT 99.00,
      shift_status TEXT NOT NULL DEFAULT 'CLOCKED_IN',
      floor_status TEXT NOT NULL DEFAULT 'Active on Floor',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
    `ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      access_tier TEXT NOT NULL,
      remember_me BOOLEAN NOT NULL DEFAULT FALSE,
      user_agent TEXT NOT NULL DEFAULT '',
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS production_orders (
      id TEXT PRIMARY KEY,
      job_code TEXT UNIQUE NOT NULL,
      offline_id TEXT UNIQUE NOT NULL,
      branch_id TEXT REFERENCES factory_branches(id) ON DELETE SET NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      garment_category TEXT NOT NULL,
      quantity_bracket TEXT NOT NULL,
      exact_quantity INTEGER NOT NULL,
      specifications_ready TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT '01_brief',
      size_breakdown JSONB NOT NULL DEFAULT '{"XS":0,"S":0,"M":0,"L":0,"XL":0,"XXL":0}'::jsonb,
      estimated_unit_cost_ngn BIGINT NOT NULL DEFAULT 0,
      total_quote_ngn BIGINT NOT NULL DEFAULT 0,
      estimated_fabric_meters INTEGER NOT NULL DEFAULT 0,
      estimated_lead_weeks INTEGER NOT NULL DEFAULT 4,
      discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
      promo_code TEXT,
      assigned_pattern_designer TEXT NOT NULL,
      assigned_tailor_lead TEXT NOT NULL,
      assigned_qc_inspector TEXT NOT NULL,
      units_sewn INTEGER NOT NULL DEFAULT 0,
      units_passed_qc INTEGER NOT NULL DEFAULT 0,
      units_rework INTEGER NOT NULL DEFAULT 0,
      target_delivery_date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS fabric_inventory (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      stock_level INTEGER NOT NULL DEFAULT 0,
      reorder_threshold INTEGER NOT NULL DEFAULT 100,
      daily_burn_rate NUMERIC(8,2) NOT NULL DEFAULT 10.0,
      cost_per_unit_ngn BIGINT NOT NULL DEFAULT 0,
      supplier_name TEXT NOT NULL,
      batch_lot TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      supplier_name TEXT NOT NULL,
      material_sku TEXT NOT NULL,
      material_name TEXT NOT NULL,
      quantity_ordered INTEGER NOT NULL,
      unit TEXT NOT NULL,
      unit_cost_ngn BIGINT NOT NULL,
      total_cost_ngn BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      received_at TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS factory_expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_ngn BIGINT NOT NULL,
      recorded_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS factory_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      target_ref TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  ];

  for (const ddl of ddlStatements) {
    await executeSqlQuery(ddl);
  }

  await syncSurulereOnlyFacilityInDb();

  for (const a of INITIAL_ARTISANS) {
    await executeSqlQuery(
      `INSERT INTO staff_users (
        id, name, email, access_tier, artisan_role, branch_id, branch_name,
        specialty, station, active_runs, units_completed_month, qc_pass_rate, shift_status, floor_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (email) DO UPDATE SET
        branch_id = $6,
        branch_name = $7`,
      [
        a.id,
        a.name,
        a.email,
        a.accessTier,
        a.role,
        a.branchId,
        a.branchName,
        a.specialty,
        a.station,
        a.activeRuns,
        a.unitsCompletedMonth,
        a.qcPassRate,
        a.shiftStatus,
        a.status,
      ]
    );
  }

  for (const o of INITIAL_ORDERS) {
    await executeSqlQuery(
      `INSERT INTO production_orders (
        id, job_code, offline_id, branch_id, company, email, phone,
        garment_category, quantity_bracket, exact_quantity, specifications_ready,
        details, stage, size_breakdown, estimated_unit_cost_ngn, total_quote_ngn,
        estimated_fabric_meters, estimated_lead_weeks, discount_percent, promo_code,
        assigned_pattern_designer, assigned_tailor_lead, assigned_qc_inspector,
        units_sewn, units_passed_qc, units_rework, target_delivery_date
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
      ) ON CONFLICT (job_code) DO NOTHING`,
      [
        o.id,
        o.jobCode,
        o.offlineId,
        normalizeBranchId(o.branchId),
        o.company,
        o.email,
        o.phone,
        o.garmentCategory,
        o.quantityBracket,
        o.exactQuantity,
        o.specificationsReady,
        o.details,
        o.stage,
        JSON.stringify(o.sizeBreakdown),
        o.estimatedUnitCostNgn,
        o.totalQuoteNgn,
        o.estimatedFabricMeters,
        o.estimatedLeadWeeks,
        o.discountPercent,
        o.promoCode || null,
        o.assignedPatternDesigner,
        o.assignedTailorLead,
        o.assignedQcInspector,
        o.unitsSewn,
        o.unitsPassedQc,
        o.unitsRework,
        o.targetDeliveryDate,
      ]
    );
  }

  for (const item of INITIAL_FABRIC_INVENTORY) {
    await executeSqlQuery(
      `INSERT INTO fabric_inventory (
        id, sku, name, category, unit, stock_level, reorder_threshold,
        daily_burn_rate, cost_per_unit_ngn, supplier_name, batch_lot
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (sku) DO NOTHING`,
      [
        item.id,
        item.sku,
        item.name,
        item.category,
        item.unit,
        item.stockLevel,
        item.reorderThreshold,
        item.dailyBurnRate,
        item.costPerUnitNgn,
        item.supplierName,
        item.batchLot,
      ]
    );
  }

  for (const exp of INITIAL_EXPENSES) {
    await executeSqlQuery(
      `INSERT INTO factory_expenses (id, category, description, amount_ngn, recorded_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [exp.id, exp.category, exp.description, exp.amountNgn, exp.recordedBy]
    );
  }

  for (const log of INITIAL_AUDIT_LOGS) {
    await executeSqlQuery(
      `INSERT INTO factory_audit_logs (id, action, actor, role, target_ref, summary)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [log.id, log.action, log.actor, log.role, log.targetRef, log.summary]
    );
  }

  return {
    synced: true,
    tablesCreated: [
      "factory_branches",
      "staff_users",
      "auth_sessions",
      "password_reset_tokens",
      "production_orders",
      "fabric_inventory",
      "supplier_purchase_orders",
      "factory_expenses",
      "factory_audit_logs",
    ],
    seededCounts: {
      factory_branches: INITIAL_BRANCHES.length,
      staff_users: INITIAL_ARTISANS.length,
      production_orders: INITIAL_ORDERS.length,
      fabric_inventory: INITIAL_FABRIC_INVENTORY.length,
      factory_expenses: INITIAL_EXPENSES.length,
      factory_audit_logs: INITIAL_AUDIT_LOGS.length,
    },
  };
}

/**
 * Ensures only the Surulere facility exists and migrates any legacy Yaba / VI / Ikeja records.
 */
export async function syncSurulereOnlyFacilityInDb(): Promise<void> {
  if (!getDatabaseConnectionString()) return;
  const surulere = INITIAL_BRANCHES[0];

  await executeSqlQuery(
    `INSERT INTO factory_branches (
      id, name, location, specialization, machine_count, staff_count,
      fabric_meters_stock, net_revenue_ngn, operating_expenses_ngn, true_net_profit_ngn, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      location = EXCLUDED.location`,
    [
      surulere.id,
      surulere.name,
      surulere.location,
      surulere.specialization,
      surulere.machineCount,
      surulere.staffCount,
      surulere.fabricMetersStock,
      surulere.netRevenueNgn,
      surulere.operatingExpensesNgn,
      surulere.trueNetProfitNgn,
      surulere.status,
    ]
  );

  await executeSqlQuery(
    `UPDATE staff_users
     SET branch_id = $1,
         branch_name = $2
     WHERE branch_id IS NULL
        OR branch_id IN ('BR-LOS-YABA', 'BR-LOS-VI', 'BR-LOS-IKEJA', 'br-yaba', 'br-vi', 'br-ikeja')
        OR branch_name ILIKE '%Yaba%'
        OR branch_name ILIKE '%Victoria Island%'
        OR branch_name ILIKE '%Ikeja%'`,
    [SURULERE_BRANCH_ID, SURULERE_BRANCH_NAME]
  ).catch(() => {});

  await executeSqlQuery(
    `UPDATE production_orders
     SET branch_id = $1
     WHERE branch_id IS NULL
        OR branch_id IN ('BR-LOS-YABA', 'BR-LOS-VI', 'BR-LOS-IKEJA', 'br-yaba', 'br-vi', 'br-ikeja')`,
    [SURULERE_BRANCH_ID]
  ).catch(() => {});

  await executeSqlQuery(
    `DELETE FROM factory_branches
     WHERE id IN ('BR-LOS-YABA', 'BR-LOS-VI', 'BR-LOS-IKEJA', 'br-yaba', 'br-vi', 'br-ikeja')
        OR name ILIKE '%Victoria Island%'
        OR name ILIKE '%Ikeja%'
        OR name ILIKE '%Yaba%'
        OR location ILIKE '%Victoria Island%'
        OR location ILIKE '%Ikeja%'
        OR location ILIKE '%Yaba%'`
  ).catch(() => {});

  await executeSqlQuery(
    `UPDATE factory_branches
     SET location = $2
     WHERE id = $1`,
    [SURULERE_BRANCH_ID, SURULERE_BRANCH_LOCATION]
  ).catch(() => {});
}

/**
 * Inserts a new ProductionOrder into PostgreSQL if configured.
 */
export async function insertProductionOrder(
  o: ProductionOrder
): Promise<boolean> {
  if (!getDatabaseConnectionString()) return false;
  await executeSqlQuery(
    `INSERT INTO production_orders (
      id, job_code, offline_id, branch_id, company, email, phone,
      garment_category, quantity_bracket, exact_quantity, specifications_ready,
      details, stage, size_breakdown, estimated_unit_cost_ngn, total_quote_ngn,
      estimated_fabric_meters, estimated_lead_weeks, discount_percent, promo_code,
      assigned_pattern_designer, assigned_tailor_lead, assigned_qc_inspector,
      units_sewn, units_passed_qc, units_rework, target_delivery_date
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
    ) ON CONFLICT (offline_id) DO NOTHING`,
    [
      o.id,
      o.jobCode,
      o.offlineId,
      normalizeBranchId(o.branchId),
      o.company,
      o.email,
      o.phone,
      o.garmentCategory,
      o.quantityBracket,
      o.exactQuantity,
      o.specificationsReady,
      o.details,
      o.stage,
      JSON.stringify(o.sizeBreakdown),
      o.estimatedUnitCostNgn,
      o.totalQuoteNgn,
      o.estimatedFabricMeters,
      o.estimatedLeadWeeks,
      o.discountPercent,
      o.promoCode || null,
      o.assignedPatternDesigner,
      o.assignedTailorLead,
      o.assignedQcInspector,
      o.unitsSewn,
      o.unitsPassedQc,
      o.unitsRework,
      o.targetDeliveryDate,
    ]
  );
  return true;
}
