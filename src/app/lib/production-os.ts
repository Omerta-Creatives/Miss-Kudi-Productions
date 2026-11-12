export type ProductionStage =
  | "01_brief"
  | "02_quotation"
  | "03_approved"
  | "04_production_qc"
  | "05_dispatch";

export type UserAccessTier = "superadmin" | "admin" | "staff";

export type ArtisanRole =
  | "pattern_designer"
  | "cutting_master"
  | "tailor"
  | "quality_control"
  | "production_manager";

export interface FactoryBranch {
  id: string;
  name: string;
  location: string;
  specialization: string;
  machineCount: number;
  staffCount: number;
  fabricMetersStock: number;
  netRevenueNgn: number;
  operatingExpensesNgn: number;
  trueNetProfitNgn: number;
  status: "ACTIVE" | "MAINTENANCE";
}

export interface ArtisanStaff {
  id: string;
  name: string;
  email: string;
  accessTier: UserAccessTier;
  role: ArtisanRole;
  branchId: string;
  branchName: string;
  specialty: string;
  station: string;
  activeRuns: number;
  unitsCompletedMonth: number;
  qcPassRate: number; // percentage e.g. 98.4
  shiftStatus: "CLOCKED_IN" | "BREAK" | "OFF_SHIFT";
  status: "Active on Floor" | "Pattern Studio" | "QC Station" | "Executive HQ";
}

export interface SizeBreakdown {
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
}

export interface ProductionOrder {
  id: string;
  jobCode: string; // e.g. MKP-20261025-841
  offlineId: string;
  branchId?: string;
  company: string;
  email: string;
  phone: string;
  garmentCategory: string;
  quantityBracket: string;
  exactQuantity: number;
  specificationsReady: string;
  details: string;
  stage: ProductionStage;
  sizeBreakdown: SizeBreakdown;
  estimatedUnitCostNgn: number;
  totalQuoteNgn: number;
  estimatedFabricMeters: number;
  estimatedLeadWeeks: number;
  discountPercent: number;
  promoCode?: string;
  assignedPatternDesigner: string;
  assignedTailorLead: string;
  assignedQcInspector: string;
  unitsSewn: number;
  unitsPassedQc: number;
  unitsRework: number;
  targetDeliveryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface FabricInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: "Fabric Roll" | "Trim & Hardware" | "Labels & Packaging";
  unit: "meters" | "pieces" | "cones";
  stockLevel: number;
  reorderThreshold: number;
  dailyBurnRate: number; // units per day based on 30-day velocity
  costPerUnitNgn: number;
  supplierName: string;
  batchLot: string;
}

export interface SupplierPurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  materialSku: string;
  materialName: string;
  quantityOrdered: number;
  unit: string;
  unitCostNgn: number;
  totalCostNgn: number;
  status: "issued" | "received";
  createdAt: string;
  receivedAt?: string;
}

export interface BrandClientCrm {
  id: string;
  brandName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  tier: "Emerging Label" | "Studio Partner" | "Collection Partner" | "Heritage VIP";
  lifetimeUnitsOrdered: number;
  lifetimeSpendNgn: number;
  loyaltyPoints: number;
  discountRate: number; // percentage
  lastOrderDate: string;
}

export interface FactoryExpense {
  id: string;
  category:
    | "generator_diesel"
    | "machinery_maintenance"
    | "artisan_payroll"
    | "fabric_logistics"
    | "phcn_utilities"
    | "qc_packaging";
  description: string;
  amountNgn: number;
  recordedBy: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  role: string;
  targetRef: string;
  summary: string;
  createdAt: string;
}

export type InvoiceStatus = "draft" | "issued" | "part_paid" | "paid";

export type PaymentMethod =
  | "Bank Transfer"
  | "Corporate Card"
  | "POS Terminal"
  | "Cash Deposit";

export interface InvoiceLineItem {
  id: string;
  description: string;
  sizeSpec?: string;
  quantity: number;
  unitPriceNgn: number;
  lineTotalNgn: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  jobCode?: string;
  branchId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  subtotalNgn: number;
  discountPercent: number;
  discountAmountNgn: number;
  vatPercent: number;
  vatAmountNgn: number;
  totalAmountNgn: number;
  amountPaidNgn: number;
  balanceDueNgn: number;
  status: InvoiceStatus;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  jobCode?: string;
  clientName: string;
  clientEmail: string;
  amountPaidNgn: number;
  balanceAfterNgn: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  receivedBy: string;
  paidAt: string;
  notes?: string;
}

export const STAGE_METADATA: Record<
  ProductionStage,
  { stepNumber: string; label: string; shortLabel: string; description: string }
> = {
  "01_brief": {
    stepNumber: "01",
    label: "Share your brief",
    shortLabel: "Brief Received",
    description: "Order specifications, quantity, size ratio and target delivery logged.",
  },
  "02_quotation": {
    stepNumber: "02",
    label: "Review & quotation",
    shortLabel: "Pattern & Quote Review",
    description: "Pattern designer reviews tech pack, fabric consumption and pro-forma costing.",
  },
  "03_approved": {
    stepNumber: "03",
    label: "Approve the details",
    shortLabel: "Sample & Tech Pack Approved",
    description: "Pre-production sample, size grading and markers approved for bulk cutting.",
  },
  "04_production_qc": {
    stepNumber: "04",
    label: "Production & checks",
    shortLabel: "Sewing Floor & QC Checks",
    description: "Active bulk sewing by assigned tailors with inline & final Quality Control inspection.",
  },
  "05_dispatch": {
    stepNumber: "05",
    label: "Prepare for delivery",
    shortLabel: "Finished & Dispatched",
    description: "Final pressing, private-label tagging, poly-bagging and dispatch to brand.",
  },
};

export const ARTISAN_ROLE_LABELS: Record<ArtisanRole, string> = {
  pattern_designer: "Pattern Designer",
  cutting_master: "Cutting Master",
  tailor: "Master Tailor / Sewing Lead",
  quality_control: "Quality Control (QC)",
  production_manager: "Production Manager",
};

export const ACCESS_TIER_LABELS: Record<UserAccessTier, string> = {
  superadmin: "Superadmin (Global HQ)",
  admin: "Factory Admin / Manager",
  staff: "Artisan / Floor Staff",
};

export const INITIAL_BRANCHES: FactoryBranch[] = [
  {
    id: "br-yaba",
    name: "Yaba Flagship Production Plant",
    location: "1 Alawode Street, Lagos, Nigeria",
    specialization: "High-Volume Bulk Sewing, Knits, Wovens & AQL 2.5 QC Hub",
    machineCount: 48,
    staffCount: 2,
    fabricMetersStock: 0,
    netRevenueNgn: 0,
    operatingExpensesNgn: 0,
    trueNetProfitNgn: 0,
    status: "ACTIVE",
  },
  {
    id: "br-vi",
    name: "Victoria Island Pattern & Sample Atelier",
    location: "Adeola Odeku, Victoria Island, Lagos",
    specialization: "CAD Pattern Drafting, Luxury Resortwear, Draping & Client Fittings",
    machineCount: 16,
    staffCount: 0,
    fabricMetersStock: 0,
    netRevenueNgn: 0,
    operatingExpensesNgn: 0,
    trueNetProfitNgn: 0,
    status: "ACTIVE",
  },
  {
    id: "br-ikeja",
    name: "Ikeja Workwear & Export Finishing Depot",
    location: "Ikeja Industrial Estate, Lagos",
    specialization: "Corporate Uniforms, Heavy Twill/Denim, Steam Pressing & Export Cartons",
    machineCount: 28,
    staffCount: 0,
    fabricMetersStock: 0,
    netRevenueNgn: 0,
    operatingExpensesNgn: 0,
    trueNetProfitNgn: 0,
    status: "ACTIVE",
  },
];

export const PROMO_CODES: Record<
  string,
  { code: string; label: string; discountPercent: number; minUnits: number }
> = {
  LAGOSVIP10: {
    code: "LAGOSVIP10",
    label: "10% VIP Collection Partner Discount",
    discountPercent: 10,
    minUnits: 100,
  },
  FIRSTBULK5: {
    code: "FIRSTBULK5",
    label: "5% First Bulk Run Welcome Credit",
    discountPercent: 5,
    minUnits: 50,
  },
  SCALE1000: {
    code: "SCALE1000",
    label: "12% High-Volume Scale Contract (1,000+ pcs)",
    discountPercent: 12,
    minUnits: 1000,
  },
};

export const INITIAL_ARTISANS: ArtisanStaff[] = [
  {
    id: "art-super-demola",
    name: "Demola Blaze",
    email: "demolablaze@gmail.com",
    accessTier: "superadmin",
    role: "production_manager",
    branchId: "br-yaba",
    branchName: "Yaba Flagship Production Plant",
    specialty: "Founder, Global Superadmin & Multi-Facility Operations",
    station: "Executive HQ, Lagos",
    activeRuns: 0,
    unitsCompletedMonth: 0,
    qcPassRate: 100,
    shiftStatus: "CLOCKED_IN",
    status: "Executive HQ",
  },
  {
    id: "art-admin-kudi",
    name: "Kudi Lasisi",
    email: "kudi@kproductions.com",
    accessTier: "admin",
    role: "production_manager",
    branchId: "br-yaba",
    branchName: "Yaba Flagship Production Plant",
    specialty: "Plant Operations, Private-Label Production & Floor Management",
    station: "Plant Planning & Merchandising Desk",
    activeRuns: 0,
    unitsCompletedMonth: 0,
    qcPassRate: 100,
    shiftStatus: "CLOCKED_IN",
    status: "Active on Floor",
  },
];

export const INITIAL_ORDERS: ProductionOrder[] = [];

export const INITIAL_FABRIC_INVENTORY: FabricInventoryItem[] = [];

export const INITIAL_BRAND_CLIENTS: BrandClientCrm[] = [];

export const INITIAL_EXPENSES: FactoryExpense[] = [];

export const INITIAL_POS: SupplierPurchaseOrder[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export const INITIAL_INVOICES: ClientInvoice[] = [];

export const INITIAL_RECEIPTS: PaymentReceipt[] = [];

// Category pricing & fabric consumption baselines
export const GARMENT_ESTIMATION_SPECS: Record<
  string,
  {
    baseUnitCostNgn: number;
    fabricMetersPerUnit: number;
    baseLeadWeeks: number;
    defaultPatternDesigner: string;
    defaultTailorLead: string;
    defaultQcInspector: string;
  }
> = {
  "T-shirts and tops": {
    baseUnitCostNgn: 9500,
    fabricMetersPerUnit: 1.3,
    baseLeadWeeks: 3,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "T‑shirts and tops": {
    baseUnitCostNgn: 9500,
    fabricMetersPerUnit: 1.3,
    baseLeadWeeks: 3,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "Dresses and womenswear": {
    baseUnitCostNgn: 16000,
    fabricMetersPerUnit: 2.2,
    baseLeadWeeks: 4,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "Shirts and menswear": {
    baseUnitCostNgn: 13500,
    fabricMetersPerUnit: 1.8,
    baseLeadWeeks: 3,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "Trousers and bottoms": {
    baseUnitCostNgn: 14200,
    fabricMetersPerUnit: 1.7,
    baseLeadWeeks: 4,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "Uniforms and workwear": {
    baseUnitCostNgn: 15800,
    fabricMetersPerUnit: 2.3,
    baseLeadWeeks: 4,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "Sportswear and activewear": {
    baseUnitCostNgn: 12200,
    fabricMetersPerUnit: 1.7,
    baseLeadWeeks: 3,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
  "Mixed collection / other": {
    baseUnitCostNgn: 14800,
    fabricMetersPerUnit: 2.0,
    baseLeadWeeks: 4,
    defaultPatternDesigner: "Pattern & Grading Studio",
    defaultTailorLead: "Master Sewing Line",
    defaultQcInspector: "AQL 2.5 QC Team",
  },
};

export function parseQuantityBracketToDefaultUnits(bracket: string): number {
  if (bracket.includes("Under 100")) return 80;
  if (bracket.includes("100–499")) return 250;
  if (bracket.includes("500–999")) return 600;
  if (bracket.includes("1,000–4,999")) return 1500;
  if (bracket.includes("5,000+")) return 5000;
  return 200;
}

export function computeDefaultSizeBreakdown(totalUnits: number): SizeBreakdown {
  const safeTotal = Math.max(10, Math.round(totalUnits));
  const xs = Math.round(safeTotal * 0.1);
  const s = Math.round(safeTotal * 0.22);
  const m = Math.round(safeTotal * 0.32);
  const l = Math.round(safeTotal * 0.22);
  const xl = Math.round(safeTotal * 0.1);
  const xxl = Math.max(0, safeTotal - (xs + s + m + l + xl));
  return { XS: xs, S: s, M: s > 0 ? m : 0, L: l, XL: xl, XXL: xxl };
}

export function calculateProductionEstimate(params: {
  garmentCategory: string;
  exactQuantity: number;
  specificationsReady: string;
  promoCode?: string;
}) {
  const spec =
    GARMENT_ESTIMATION_SPECS[params.garmentCategory] ||
    GARMENT_ESTIMATION_SPECS["Mixed collection / other"];

  const qty = Math.max(20, Number(params.exactQuantity) || 100);

  let volumeDiscount = 0;
  let volumeTierLabel = "Standard Run (<100 pcs)";
  if (qty >= 5000) {
    volumeDiscount = 18;
    volumeTierLabel = "Enterprise Bulk Tier (18% volume efficiency)";
  } else if (qty >= 1000) {
    volumeDiscount = 12;
    volumeTierLabel = "Scale Run Tier (12% volume efficiency)";
  } else if (qty >= 500) {
    volumeDiscount = 7;
    volumeTierLabel = "Mid-Bulk Tier (7% volume efficiency)";
  } else if (qty >= 100) {
    volumeDiscount = 3;
    volumeTierLabel = "Studio Bulk Tier (3% volume efficiency)";
  }

  const needsPatternHelp =
    params.specificationsReady.includes("Need help") ||
    params.specificationsReady.includes("Sample");
  const patternFeePerUnit = needsPatternHelp ? 650 : 0;

  const normalizedCode = (params.promoCode || "").trim().toUpperCase();
  const matchedPromo = PROMO_CODES[normalizedCode];
  const promoDiscount =
    matchedPromo && qty >= matchedPromo.minUnits ? matchedPromo.discountPercent : 0;

  const combinedDiscountPercent = Math.min(25, volumeDiscount + promoDiscount);
  const rawUnitCost = spec.baseUnitCostNgn + patternFeePerUnit;
  const estimatedUnitCostNgn =
    Math.round(((rawUnitCost * (100 - combinedDiscountPercent)) / 100) / 50) * 50;

  const totalQuoteNgn = estimatedUnitCostNgn * qty;
  const estimatedFabricMeters = Math.ceil(qty * spec.fabricMetersPerUnit * 1.05);
  const estimatedLeadWeeks =
    qty >= 1500
      ? spec.baseLeadWeeks + 2
      : qty >= 500
      ? spec.baseLeadWeeks + 1
      : spec.baseLeadWeeks;

  return {
    estimatedUnitCostNgn,
    totalQuoteNgn,
    estimatedFabricMeters,
    estimatedLeadWeeks,
    volumeTierLabel,
    combinedDiscountPercent,
    promoApplied: promoDiscount > 0 ? matchedPromo.code : undefined,
    assignedPatternDesigner: spec.defaultPatternDesigner,
    assignedTailorLead: spec.defaultTailorLead,
    assignedQcInspector: spec.defaultQcInspector,
  };
}

const STORAGE_KEYS = {
  ORDERS: "mkp_nexus_orders_v5",
  ARTISANS: "mkp_nexus_artisans_v5",
  BRANCHES: "mkp_nexus_branches_v5",
  INVENTORY: "mkp_nexus_inventory_v5",
  POS: "mkp_nexus_pos_v5",
  CLIENTS: "mkp_nexus_clients_v5",
  EXPENSES: "mkp_nexus_expenses_v5",
  INVOICES: "mkp_nexus_invoices_v5",
  RECEIPTS: "mkp_nexus_receipts_v5",
  AUDIT: "mkp_nexus_audit_v5",
  DRAFT_SIZE_MATRIX: "mkp_nexus_draft_sizes_v5",
  CURRENT_USER: "mkp_nexus_session_user_v5",
  SESSION_META: "mkp_nexus_session_meta_v5",
  REMEMBERED_EMAIL: "mkp_nexus_remembered_email_v5",
  PASSWORD_VAULT: "mkp_nexus_pwd_hashes_v5",
  ACTIVE_BRANCH: "mkp_nexus_active_branch_v5",
};

export interface ClientSessionMeta {
  authenticated: boolean;
  rememberMe: boolean;
  expiresAt: string;
  signedInAt: string;
  sessionId?: string;
}

// --- RBAC Session Helpers ---
export function getCurrentSessionMeta(): ClientSessionMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const rawSession =
      sessionStorage.getItem(STORAGE_KEYS.SESSION_META) ||
      localStorage.getItem(STORAGE_KEYS.SESSION_META);
    if (!rawSession) return null;
    const parsed = JSON.parse(rawSession) as ClientSessionMeta;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      clearCurrentSessionUser();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSessionAuthenticated(): boolean {
  const meta = getCurrentSessionMeta();
  return Boolean(meta?.authenticated);
}

export function sanitizeSpecialtyText(text: string): string {
  return String(text || "")
    .replace(/\s*\([^)]*user_[A-Za-z0-9]+[^)]*\)/gi, "")
    .trim();
}

export function getCurrentSessionUser(): ArtisanStaff {
  if (typeof window === "undefined") return INITIAL_ARTISANS[0];
  try {
    const meta = getCurrentSessionMeta();
    const raw =
      sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER) ||
      localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return INITIAL_ARTISANS[0];
    if (meta && new Date(meta.expiresAt).getTime() <= Date.now()) {
      clearCurrentSessionUser();
      return INITIAL_ARTISANS[0];
    }
    const parsed = JSON.parse(raw) as ArtisanStaff;
    return {
      ...parsed,
      specialty: sanitizeSpecialtyText(parsed.specialty),
    };
  } catch {
    return INITIAL_ARTISANS[0];
  }
}

export function setCurrentSessionUser(
  user: ArtisanStaff,
  options?: { rememberMe?: boolean; expiresAt?: string; sessionId?: string }
) {
  if (typeof window === "undefined") return;
  const existingMeta = getCurrentSessionMeta();
  const rememberMe = options?.rememberMe ?? existingMeta?.rememberMe ?? true;
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  const meta: ClientSessionMeta = {
    authenticated: true,
    rememberMe,
    expiresAt:
      options?.expiresAt || new Date(Date.now() + ttlMs).toISOString(),
    signedInAt: new Date().toISOString(),
    sessionId: options?.sessionId || existingMeta?.sessionId,
  };

  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.SESSION_META, JSON.stringify(meta));
    localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, user.email.toLowerCase());
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_META);
  } else {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    sessionStorage.setItem(STORAGE_KEYS.SESSION_META, JSON.stringify(meta));
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_META);
  }

  if (user.branchId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH, user.branchId);
  }
  window.dispatchEvent(new CustomEvent("mkp:session-change", { detail: user }));
}

export function clearCurrentSessionUser(options?: { forgetEmail?: boolean }) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_META);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.SESSION_META);
  if (options?.forgetEmail) {
    localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
  }
  window.dispatchEvent(new CustomEvent("mkp:session-change", { detail: null }));
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL) || "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string, remember: boolean) {
  if (typeof window === "undefined") return;
  if (remember && email.trim()) {
    localStorage.setItem(
      STORAGE_KEYS.REMEMBERED_EMAIL,
      email.trim().toLowerCase()
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
  }
}

export function loadLocalPasswordHashes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PASSWORD_VAULT);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalPasswordHash(email: string, passwordHash: string) {
  if (typeof window === "undefined" || !email || !passwordHash) return;
  const current = loadLocalPasswordHashes();
  current[email.trim().toLowerCase()] = passwordHash;
  localStorage.setItem(STORAGE_KEYS.PASSWORD_VAULT, JSON.stringify(current));
}

export function isSuperAdminUser(user?: ArtisanStaff | null): boolean {
  return user?.accessTier === "superadmin";
}

export function canManageFactory(user?: ArtisanStaff | null): boolean {
  return user?.accessTier === "superadmin" || user?.accessTier === "admin";
}

export function isStaffUser(user?: ArtisanStaff | null): boolean {
  return user?.accessTier === "staff";
}

export function getActiveBranchId(): string {
  if (typeof window === "undefined") return INITIAL_BRANCHES[0].id;
  const user = getCurrentSessionUser();
  if (isStaffUser(user) && user.branchId) {
    return user.branchId;
  }
  return (
    localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH) ||
    user.branchId ||
    INITIAL_BRANCHES[0].id
  );
}

export function setActiveBranchId(branchId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH, branchId);
  window.dispatchEvent(
    new CustomEvent("mkp:branch-change", { detail: branchId })
  );
}

export function loadBranches(): FactoryBranch[] {
  if (typeof window === "undefined") return INITIAL_BRANCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.BRANCHES,
        JSON.stringify(INITIAL_BRANCHES)
      );
      return INITIAL_BRANCHES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BRANCHES;
  }
}

export function saveBranches(branches: FactoryBranch[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
}

export interface DraftSizeMatrixPayload {
  garmentCategory: string;
  totalQuantity: number;
  sizeBreakdown: SizeBreakdown;
  unitSystem: "in" | "cm";
  updatedAt: string;
}

export function saveDraftSizeMatrix(payload: DraftSizeMatrixPayload) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.DRAFT_SIZE_MATRIX, JSON.stringify(payload));
}

export function loadDraftSizeMatrix(): DraftSizeMatrixPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT_SIZE_MATRIX);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadOrders(): ProductionOrder[] {
  if (typeof window === "undefined") return INITIAL_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveOrders(orders: ProductionOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function upsertOrderIdempotent(order: ProductionOrder): ProductionOrder[] {
  const existing = loadOrders();
  const idx = existing.findIndex(
    (o) => o.offlineId === order.offlineId || o.jobCode === order.jobCode
  );
  let next: ProductionOrder[];
  if (idx >= 0) {
    next = existing.map((o, i) => (i === idx ? order : o));
  } else {
    next = [order, ...existing];
  }
  saveOrders(next);
  return next;
}

export function loadArtisans(): ArtisanStaff[] {
  if (typeof window === "undefined") return INITIAL_ARTISANS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARTISANS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ARTISANS, JSON.stringify(INITIAL_ARTISANS));
      return INITIAL_ARTISANS;
    }
    const parsed = JSON.parse(raw) as ArtisanStaff[];
    return parsed.map((a) => ({
      ...a,
      specialty: sanitizeSpecialtyText(a.specialty),
    }));
  } catch {
    return INITIAL_ARTISANS;
  }
}

export function saveArtisans(list: ArtisanStaff[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ARTISANS, JSON.stringify(list));
}

export function loadInventory(): FabricInventoryItem[] {
  if (typeof window === "undefined") return INITIAL_FABRIC_INVENTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.INVENTORY,
        JSON.stringify(INITIAL_FABRIC_INVENTORY)
      );
      return INITIAL_FABRIC_INVENTORY;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FABRIC_INVENTORY;
  }
}

export function saveInventory(list: FabricInventoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(list));
}

export function loadPurchaseOrders(): SupplierPurchaseOrder[] {
  if (typeof window === "undefined") return INITIAL_POS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(INITIAL_POS));
      return INITIAL_POS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_POS;
  }
}

export function savePurchaseOrders(list: SupplierPurchaseOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(list));
}

export function loadBrandClients(): BrandClientCrm[] {
  if (typeof window === "undefined") return INITIAL_BRAND_CLIENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_BRAND_CLIENTS));
      return INITIAL_BRAND_CLIENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BRAND_CLIENTS;
  }
}

export function saveBrandClients(list: BrandClientCrm[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(list));
}

export function loadExpenses(): FactoryExpense[] {
  if (typeof window === "undefined") return INITIAL_EXPENSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(list: FactoryExpense[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
}

export function loadAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return INITIAL_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function appendAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">) {
  const current = loadAuditLogs();
  const next: AuditLogEntry[] = [
    {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(next));
  }
  return next;
}

export function loadInvoices(): ClientInvoice[] {
  if (typeof window === "undefined") return INITIAL_INVOICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INVOICES;
  }
}

export function saveInvoices(list: ClientInvoice[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("mkp:billing-change"));
}

export function loadReceipts(): PaymentReceipt[] {
  if (typeof window === "undefined") return INITIAL_RECEIPTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(INITIAL_RECEIPTS));
      return INITIAL_RECEIPTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECEIPTS;
  }
}

export function saveReceipts(list: PaymentReceipt[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("mkp:billing-change"));
}

export function computeInvoiceTotals(
  items: InvoiceLineItem[],
  discountPercent: number,
  vatPercent: number,
  amountPaidNgn = 0
) {
  const normalizedItems = items.map((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const rate = Math.max(0, Number(item.unitPriceNgn) || 0);
    return {
      ...item,
      quantity: qty,
      unitPriceNgn: rate,
      lineTotalNgn: Math.round(qty * rate),
    };
  });
  const subtotalNgn = normalizedItems.reduce((sum, i) => sum + i.lineTotalNgn, 0);
  const discPct = Math.min(50, Math.max(0, Number(discountPercent) || 0));
  const discountAmountNgn = Math.round(subtotalNgn * (discPct / 100));
  const netAfterDiscount = Math.max(0, subtotalNgn - discountAmountNgn);
  const vatPct = Math.max(0, Number(vatPercent) || 0);
  const vatAmountNgn = Math.round(netAfterDiscount * (vatPct / 100));
  const totalAmountNgn = netAfterDiscount + vatAmountNgn;
  const paid = Math.min(totalAmountNgn, Math.max(0, Math.round(amountPaidNgn)));
  const balanceDueNgn = Math.max(0, totalAmountNgn - paid);
  const status: InvoiceStatus =
    totalAmountNgn > 0 && balanceDueNgn === 0
      ? "paid"
      : paid > 0
      ? "part_paid"
      : "issued";

  return {
    items: normalizedItems,
    subtotalNgn,
    discountPercent: discPct,
    discountAmountNgn,
    vatPercent: vatPct,
    vatAmountNgn,
    totalAmountNgn,
    amountPaidNgn: paid,
    balanceDueNgn,
    status,
  };
}

export function generateInvoiceNumber(): string {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `INV-MKP-${dateStamp}-${rand}`;
}

export function generateReceiptNumber(): string {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `RCP-MKP-${dateStamp}-${rand}`;
}

export function buildInvoiceFromOrder(
  order: ProductionOrder,
  options?: { vatPercent?: number; dueDays?: number }
): ClientInvoice {
  const now = new Date();
  const issueDate = now.toISOString().slice(0, 10);
  const dueDays = options?.dueDays ?? 14;
  const dueDate = new Date(now.getTime() + dueDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const vatPercent = options?.vatPercent ?? 0;

  const sizeSummary = (["XS", "S", "M", "L", "XL", "XXL"] as const)
    .filter((sz) => (order.sizeBreakdown?.[sz] || 0) > 0)
    .map((sz) => `${sz}: ${order.sizeBreakdown[sz]}`)
    .join(", ");

  const rawItems: InvoiceLineItem[] = [
    {
      id: `itm-${Date.now()}-1`,
      description: `${order.garmentCategory} bulk production (${order.specificationsReady})`,
      sizeSpec: sizeSummary || "Graded XS to XXL run",
      quantity: order.exactQuantity,
      unitPriceNgn: order.estimatedUnitCostNgn,
      lineTotalNgn: order.exactQuantity * order.estimatedUnitCostNgn,
    },
  ];

  // Note: order.estimatedUnitCostNgn already incorporates volume discount, so invoice discountPercent = 0 to match order.totalQuoteNgn accurately.
  const totals = computeInvoiceTotals(rawItems, 0, vatPercent, 0);

  return {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    invoiceNumber: generateInvoiceNumber(),
    jobCode: order.jobCode,
    branchId: order.branchId,
    clientName: order.company,
    clientEmail: order.email,
    clientPhone: order.phone,
    clientAddress: "Lagos, Nigeria",
    issueDate,
    dueDate,
    ...totals,
    paymentTerms:
      "60% deposit required prior to bulk fabric cutting; 40% balance due upon AQL 2.5 quality sign-off and prior to dispatch.",
    notes: `Linked to Job Code ${order.jobCode} (${order.estimatedFabricMeters.toLocaleString()}m estimated fabric allocation).`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function recordInvoicePayment(params: {
  invoiceId: string;
  amountNgn: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  receivedBy: string;
  notes?: string;
}): {
  invoices: ClientInvoice[];
  receipts: PaymentReceipt[];
  updatedInvoice: ClientInvoice | null;
  receipt: PaymentReceipt | null;
} {
  const currentInvoices = loadInvoices();
  const currentReceipts = loadReceipts();
  const target = currentInvoices.find((inv) => inv.id === params.invoiceId);
  if (!target) {
    return {
      invoices: currentInvoices,
      receipts: currentReceipts,
      updatedInvoice: null,
      receipt: null,
    };
  }

  const cleanAmount = Math.min(
    target.balanceDueNgn,
    Math.max(1, Math.round(Number(params.amountNgn) || 0))
  );
  const nextPaid = target.amountPaidNgn + cleanAmount;
  const recomputed = computeInvoiceTotals(
    target.items,
    target.discountPercent,
    target.vatPercent,
    nextPaid
  );

  const nowIso = new Date().toISOString();
  const updatedInvoice: ClientInvoice = {
    ...target,
    ...recomputed,
    updatedAt: nowIso,
  };

  const nextInvoices = currentInvoices.map((inv) =>
    inv.id === updatedInvoice.id ? updatedInvoice : inv
  );
  saveInvoices(nextInvoices);

  const receipt: PaymentReceipt = {
    id: `rcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receiptNumber: generateReceiptNumber(),
    invoiceId: updatedInvoice.id,
    invoiceNumber: updatedInvoice.invoiceNumber,
    jobCode: updatedInvoice.jobCode,
    clientName: updatedInvoice.clientName,
    clientEmail: updatedInvoice.clientEmail,
    amountPaidNgn: cleanAmount,
    balanceAfterNgn: updatedInvoice.balanceDueNgn,
    paymentMethod: params.paymentMethod,
    paymentReference:
      params.paymentReference?.trim() ||
      `TRF-${Date.now().toString().slice(-6)}`,
    receivedBy: params.receivedBy,
    paidAt: nowIso,
    notes: params.notes?.trim() || undefined,
  };

  const nextReceipts = [receipt, ...currentReceipts];
  saveReceipts(nextReceipts);

  appendAuditLog({
    action: "finance.payment_received",
    actor: params.receivedBy,
    role: "Accounts & Production Desk",
    targetRef: receipt.receiptNumber,
    summary: `Issued official receipt ${receipt.receiptNumber} for ₦${cleanAmount.toLocaleString()} against ${updatedInvoice.invoiceNumber} (${updatedInvoice.clientName}).`,
  });

  return {
    invoices: nextInvoices,
    receipts: nextReceipts,
    updatedInvoice,
    receipt,
  };
}
