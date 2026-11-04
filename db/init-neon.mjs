import fs from "node:fs";
import path from "node:path";

const conn =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  "";

if (!conn || conn.includes("YOUR_NEON_PASSWORD")) {
  console.error("No live DATABASE_URL / POSTGRES_URL found in environment.");
  process.exit(1);
}

const parsed = new URL(conn);
const endpoint = `https://${parsed.host}/sql`;

async function runQuery(query, params = []) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": conn,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Connecting to Neon Serverless Postgres host: ${parsed.host} ...`);
  const schemaPath = path.join(process.cwd(), "db", "neon-schema.sql");
  const rawSql = fs.readFileSync(schemaPath, "utf8");

  // Strip single-line SQL comments first, then split by semicolon
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

  // Seed initial branches idempotently
  await runQuery(
    `INSERT INTO factory_branches (id, name, location, specialization, machine_count, staff_count, fabric_meters_stock, net_revenue_ngn, operating_expenses_ngn, true_net_profit_ngn, status)
     VALUES
       ('BR-LOS-YABA', 'Yaba Flagship Production Plant', '1 Alawode Street, Lagos, Nigeria', 'Woven Tops, Streetwear & Bulk Cut-and-Sew', 48, 2, 0, 0, 0, 0, 'ACTIVE'),
       ('BR-LOS-VI', 'Victoria Island Bespoke & Bridal Atelier', 'Adeola Odeku, Victoria Island, Lagos', 'Couture Draping, Silk & Luxury Eveningwear', 22, 0, 0, 0, 0, 0, 'ACTIVE'),
       ('BR-LOS-IKEJA', 'Ikeja Bulk Uniform & Industrial Depot', 'Oba Akran Industrial Estate, Ikeja', 'Corporate Uniforms, Workwear & Heavy Denim', 64, 0, 0, 0, 0, 0, 'ACTIVE')
     ON CONFLICT (id) DO UPDATE SET location = EXCLUDED.location`
  );

  // Seed initial Superadmin and Admin accounts idempotently
  await runQuery(
    `INSERT INTO staff_users (id, clerk_user_id, name, email, access_tier, artisan_role, branch_id, branch_name, specialty, station, active_runs, units_completed_month, qc_pass_rate, shift_status, floor_status)
     VALUES
       ('art-super-demola', 'user_3LDmpp5iS8YnIwmYQlrRwVZCLz2', 'Demola Blaze', 'demolablaze@gmail.com', 'superadmin', 'production_manager', 'BR-LOS-YABA', 'Yaba Flagship Production Plant', 'Founder, Global Superadmin & Multi-Facility Operations', 'Executive HQ · 1 Alawode Street, Lagos', 0, 0, 100, 'CLOCKED_IN', 'Executive HQ'),
       ('art-admin-kudi', 'user_3LE1rxmmBT3KKgnGB1S4E4eTHbF', 'Kudi Lasisi', 'kudi@kproductions.com', 'admin', 'production_manager', 'BR-LOS-YABA', 'Yaba Flagship Production Plant', 'Plant Operations, Private-Label Production & Floor Management', '1 Alawode Street, Lagos', 0, 0, 100, 'CLOCKED_IN', 'Active on Floor')
     ON CONFLICT (email) DO NOTHING`
  );

  const tablesRes = await runQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  const tableNames = tablesRes.rows.map((r) => r.table_name);
  const staffCountRes = await runQuery(`SELECT COUNT(*)::int AS cnt FROM staff_users`);
  const branchCountRes = await runQuery(`SELECT COUNT(*)::int AS cnt FROM factory_branches`);

  console.log(`✓ Verified ${tableNames.length} Neon tables:`, tableNames.join(", "));
  console.log(
    `✓ Seeded ${branchCountRes.rows[0]?.cnt} factory branches and ${staffCountRes.rows[0]?.cnt} RBAC staff accounts on Neon!`
  );
}

main().catch((err) => {
  console.error("Failed to initialize Neon schema:", err.message);
  process.exit(1);
});
