import fs from "node:fs";
import path from "node:path";

const conn =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  "";

if (!conn || conn.includes("YOUR_PASSWORD") || conn.includes("<password>")) {
  console.error("No live DATABASE_URL or POSTGRES_URL found in environment.");
  process.exit(1);
}

const parsed = new URL(conn);
const endpoint = `https://${parsed.host}/sql`;
const SQL_CONN_HEADER = ["Neon", "Connection", "String"].join("-");

async function runQuery(query, params = []) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SQL_CONN_HEADER]: conn,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgreSQL HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Connecting to PostgreSQL host: ${parsed.host} ...`);
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const rawSql = fs.readFileSync(schemaPath, "utf8");

  const withoutComments = rawSql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = withoutComments
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await runQuery(stmt);
  }

  await runQuery(
    `INSERT INTO factory_branches (id, name, location, specialization, machine_count, staff_count, fabric_meters_stock, net_revenue_ngn, operating_expenses_ngn, true_net_profit_ngn, status)
     VALUES
       ('br-surulere', 'Surulere Production Plant', '1 Alawode Street, Surulere, Lagos, Nigeria', 'CAD Pattern Studio, Bulk Cut-and-Sew Lines & AQL 2.5 Export Finishing', 92, 2, 0, 0, 0, 0, 'ACTIVE')
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       location = EXCLUDED.location,
       specialization = EXCLUDED.specialization,
       machine_count = EXCLUDED.machine_count`
  );

  await runQuery(
    `UPDATE staff_users
     SET branch_id = 'br-surulere',
         branch_name = 'Surulere Production Plant'
     WHERE branch_id IS NULL
        OR branch_id IN ('BR-LOS-YABA', 'BR-LOS-VI', 'BR-LOS-IKEJA', 'br-yaba', 'br-vi', 'br-ikeja')
        OR branch_name ILIKE '%Yaba%'
        OR branch_name ILIKE '%Victoria Island%'
        OR branch_name ILIKE '%Ikeja%'`
  );

  await runQuery(
    `UPDATE production_orders
     SET branch_id = 'br-surulere'
     WHERE branch_id IS NULL
        OR branch_id IN ('BR-LOS-YABA', 'BR-LOS-VI', 'BR-LOS-IKEJA', 'br-yaba', 'br-vi', 'br-ikeja')`
  );

  await runQuery(
    `DELETE FROM factory_branches
     WHERE id IN ('BR-LOS-YABA', 'BR-LOS-VI', 'BR-LOS-IKEJA', 'br-yaba', 'br-vi', 'br-ikeja')
        OR name ILIKE '%Victoria Island%'
        OR name ILIKE '%Ikeja%'
        OR name ILIKE '%Yaba%'
        OR location ILIKE '%Victoria Island%'
        OR location ILIKE '%Ikeja%'
        OR location ILIKE '%Yaba%'`
  );

  await runQuery(
    `INSERT INTO staff_users (id, name, email, access_tier, artisan_role, branch_id, branch_name, specialty, station, active_runs, units_completed_month, qc_pass_rate, shift_status, floor_status)
     VALUES
       ('art-super-demola', 'Demola Blaze', 'demolablaze@gmail.com', 'superadmin', 'production_manager', 'br-surulere', 'Surulere Production Plant', 'Founder, Global Superadmin & Surulere Plant Governance', 'Executive HQ, 1 Alawode Street, Surulere, Lagos', 0, 0, 100, 'CLOCKED_IN', 'Executive HQ'),
       ('art-admin-kudi', 'Kudi Lasisi', 'kudi@kproductions.com', 'admin', 'production_manager', 'br-surulere', 'Surulere Production Plant', 'Plant Operations, Private-Label Production & Floor Management', '1 Alawode Street, Surulere, Lagos', 0, 0, 100, 'CLOCKED_IN', 'Active on Floor')
     ON CONFLICT (email) DO UPDATE SET
       branch_id = EXCLUDED.branch_id,
       branch_name = EXCLUDED.branch_name`
  );

  const tablesRes = await runQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  const tableNames = tablesRes.rows.map((r) => r.table_name);
  const staffCountRes = await runQuery(`SELECT COUNT(*)::int AS cnt FROM staff_users`);
  const branchCountRes = await runQuery(`SELECT COUNT(*)::int AS cnt FROM factory_branches`);

  console.log(`✓ Verified ${tableNames.length} PostgreSQL tables:`, tableNames.join(", "));
  console.log(
    `✓ Seeded ${branchCountRes.rows[0]?.cnt} factory branches and ${staffCountRes.rows[0]?.cnt} staff/admin accounts!`
  );
}

main().catch((err) => {
  console.error("Failed to initialize PostgreSQL schema:", err.message);
  process.exit(1);
});
