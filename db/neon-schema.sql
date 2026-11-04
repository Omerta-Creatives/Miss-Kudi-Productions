-- Miss Kudi Productions — Neon Serverless PostgreSQL Schema + Clerk RBAC Integration
-- Apply in Neon SQL Editor or via POST /api/admin/init-db

CREATE TABLE IF NOT EXISTS factory_branches (
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
);

CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT UNIQUE,
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
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_tier TEXT NOT NULL,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_orders (
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
);

CREATE TABLE IF NOT EXISTS fabric_inventory (
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
);

CREATE TABLE IF NOT EXISTS supplier_purchase_orders (
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
);

CREATE TABLE IF NOT EXISTS factory_expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_ngn BIGINT NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
