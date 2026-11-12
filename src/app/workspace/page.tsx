"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  appendAuditLog,
  ARTISAN_ROLE_LABELS,
  ArtisanRole,
  ArtisanStaff,
  AuditLogEntry,
  BrandClientCrm,
  FabricInventoryItem,
  FactoryExpense,
  loadArtisans,
  loadAuditLogs,
  loadBrandClients,
  loadExpenses,
  loadInventory,
  loadOrders,
  loadPurchaseOrders,
  ProductionOrder,
  ProductionStage,
  PROMO_CODES,
  saveArtisans,
  saveBrandClients,
  saveExpenses,
  saveInventory,
  saveLocalPasswordHash,
  saveOrders,
  savePurchaseOrders,
  STAGE_METADATA,
  SupplierPurchaseOrder,
  UserAccessTier,
} from "../lib/production-os";
import {
  ModalDialog,
  ProductionJobTicketModal,
} from "../components/ProductionJobTicketModal";
import { UiIcon } from "../components/UiIcon";

type WorkspaceTab =
  | "pipeline"
  | "artisans"
  | "inventory"
  | "crm"
  | "finance";

export default function FactoryWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("pipeline");
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [artisans, setArtisans] = useState<ArtisanStaff[]>([]);
  const [inventory, setInventory] = useState<FabricInventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<SupplierPurchaseOrder[]>(
    []
  );
  const [clients, setClients] = useState<BrandClientCrm[]>([]);
  const [expenses, setExpenses] = useState<FactoryExpense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notice, setNotice] = useState<string>("");

  // Modals
  const [selectedTicketOrder, setSelectedTicketOrder] =
    useState<ProductionOrder | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [artisanModalOpen, setArtisanModalOpen] = useState(false);
  const [zReportModalOpen, setZReportModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(
    null
  );
  const [editingArtisan, setEditingArtisan] = useState<ArtisanStaff | null>(
    null
  );
  const [editingInventoryItem, setEditingInventoryItem] =
    useState<FabricInventoryItem | null>(null);
  const [editingClient, setEditingClient] = useState<BrandClientCrm | null>(
    null
  );

  // New Artisan / Admin form state
  const [newArtisan, setNewArtisan] = useState({
    name: "",
    email: "",
    password: "",
    accessTier: "staff" as UserAccessTier,
    role: "tailor" as ArtisanRole,
    specialty: "",
    station: "Sewing Line 1",
  });
  const [editArtisanPassword, setEditArtisanPassword] = useState("");

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    category: "generator_diesel" as FactoryExpense["category"],
    description: "",
    amountNgn: "",
  });

  // New Brand Client form state
  const [newClient, setNewClient] = useState({
    brandName: "",
    contactName: "",
    email: "",
    phone: "",
    city: "Lagos, Nigeria",
  });

  useEffect(() => {
    setOrders(loadOrders());
    setArtisans(loadArtisans());
    setInventory(loadInventory());
    setPurchaseOrders(loadPurchaseOrders());
    setClients(loadBrandClients());
    setExpenses(loadExpenses());
    setAuditLogs(loadAuditLogs());
  }, []);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 5000);
  };

  // --- Pipeline & QC Handlers ---
  const handleUpdateOrderStage = (jobCode: string, newStage: ProductionStage) => {
    const next = orders.map((o) => {
      if (o.jobCode !== jobCode) return o;
      const unitsSewn =
        newStage === "05_dispatch" ? o.exactQuantity : o.unitsSewn;
      const unitsPassedQc =
        newStage === "05_dispatch" ? o.exactQuantity : o.unitsPassedQc;
      return {
        ...o,
        stage: newStage,
        unitsSewn,
        unitsPassedQc,
        updatedAt: new Date().toISOString(),
      };
    });
    setOrders(next);
    saveOrders(next);
    const logs = appendAuditLog({
      action: "order.stage_updated",
      actor: "Kudi Lasisi (Plant Admin)",
      role: "Production Manager",
      targetRef: jobCode,
      summary: `Moved order ${jobCode} to Stage ${STAGE_METADATA[newStage].stepNumber} (${STAGE_METADATA[newStage].shortLabel}).`,
    });
    setAuditLogs(logs);
    showToast(
      `Order ${jobCode} updated to ${STAGE_METADATA[newStage].shortLabel}.`
    );
  };

  const handleAssignArtisan = (
    jobCode: string,
    field:
      | "assignedPatternDesigner"
      | "assignedTailorLead"
      | "assignedQcInspector",
    artisanName: string
  ) => {
    const next = orders.map((o) =>
      o.jobCode === jobCode
        ? { ...o, [field]: artisanName, updatedAt: new Date().toISOString() }
        : o
    );
    setOrders(next);
    saveOrders(next);
    const logs = appendAuditLog({
      action: "order.artisan_assigned",
      actor: "Kudi Lasisi",
      role: "Production Manager",
      targetRef: jobCode,
      summary: `Assigned ${artisanName} (${field.replace("assigned", "")}) to job ${jobCode}.`,
    });
    setAuditLogs(logs);
    showToast(`Assigned ${artisanName} to ${jobCode}.`);
  };

  const handleLogFloorProgress = (jobCode: string, addSewn: number) => {
    const next = orders.map((o) => {
      if (o.jobCode !== jobCode) return o;
      const newSewn = Math.min(o.exactQuantity, o.unitsSewn + addSewn);
      const passedDelta = Math.round(addSewn * 0.98);
      const newPassed = Math.min(newSewn, o.unitsPassedQc + passedDelta);
      const newStage: ProductionStage =
        newPassed >= o.exactQuantity ? "05_dispatch" : "04_production_qc";
      return {
        ...o,
        unitsSewn: newSewn,
        unitsPassedQc: newPassed,
        stage: newStage,
        updatedAt: new Date().toISOString(),
      };
    });
    setOrders(next);
    saveOrders(next);
    const logs = appendAuditLog({
      action: "floor.batch_logged",
      actor: "Kudi Lasisi (QC Lead)",
      role: "Quality Control (QC)",
      targetRef: jobCode,
      summary: `Logged +${addSewn} sewn pieces & AQL QC inspection for ${jobCode}.`,
    });
    setAuditLogs(logs);
    showToast(`Logged +${addSewn} sewn & QC-inspected units on ${jobCode}.`);
  };

  // --- Artisan / Admin Onboarding & CRUD Handlers ---
  const handleCreateArtisan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtisan.name.trim() || !newArtisan.email.trim()) return;
    const created: ArtisanStaff = {
      id: `art-${Date.now()}`,
      name: newArtisan.name.trim(),
      email: newArtisan.email.trim().toLowerCase(),
      role: newArtisan.role,
      accessTier: newArtisan.accessTier,
      branchId: "br-yaba",
      branchName: "Yaba Flagship Production Plant",
      shiftStatus: "CLOCKED_IN",
      specialty:
        newArtisan.specialty.trim() ||
        `${ARTISAN_ROLE_LABELS[newArtisan.role]} Specialist`,
      station: newArtisan.station.trim() || "Main Factory Floor",
      activeRuns: 1,
      unitsCompletedMonth: 0,
      qcPassRate: 99.0,
      status:
        newArtisan.accessTier === "superadmin"
          ? "Executive HQ"
          : newArtisan.role === "pattern_designer"
          ? "Pattern Studio"
          : newArtisan.role === "quality_control"
          ? "QC Station"
          : "Active on Floor",
    };
    const next = [created, ...artisans];
    setArtisans(next);
    saveArtisans(next);
    fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...created,
        password: newArtisan.password.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((resData) => {
        if (resData?.passwordHash) {
          saveLocalPasswordHash(created.email, resData.passwordHash);
        }
      })
      .catch(() => {});
    const logs = appendAuditLog({
      action: "artisan.onboarded",
      actor: "Kudi Lasisi",
      role: "Production Manager",
      targetRef: created.name,
      summary: `Onboarded ${created.name} (${created.accessTier.toUpperCase()} · ${ARTISAN_ROLE_LABELS[created.role]} · ${created.station}).`,
    });
    setAuditLogs(logs);
    setNewArtisan({
      name: "",
      email: "",
      password: "",
      accessTier: "staff",
      role: "tailor",
      specialty: "",
      station: "Sewing Line 1",
    });
    setArtisanModalOpen(false);
    showToast(
      `Onboarded ${created.name} (${created.accessTier.toUpperCase()} · ${ARTISAN_ROLE_LABELS[created.role]}) to roster.`
    );
  };

  const handleSaveArtisanEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtisan) return;
    const next = artisans.map((a) =>
      a.id === editingArtisan.id ? editingArtisan : a
    );
    setArtisans(next);
    saveArtisans(next);
    const nextPassword = editArtisanPassword.trim();
    fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editingArtisan,
        password: nextPassword || undefined,
      }),
    })
      .then((r) => r.json())
      .then((resData) => {
        if (resData?.passwordHash) {
          saveLocalPasswordHash(editingArtisan.email, resData.passwordHash);
        }
      })
      .catch(() => {});
    const logs = appendAuditLog({
      action: "team.user_updated",
      actor: "Kudi Lasisi",
      role: "Plant Management",
      targetRef: editingArtisan.email,
      summary: `Updated ${editingArtisan.name} (${editingArtisan.accessTier.toUpperCase()} · ${ARTISAN_ROLE_LABELS[editingArtisan.role]})${nextPassword ? " and rotated login password" : ""}.`,
    });
    setAuditLogs(logs);
    setEditArtisanPassword("");
    setEditingArtisan(null);
    showToast(
      `Updated account for ${editingArtisan.name}${nextPassword ? " (password rotated)" : ""}.`
    );
  };

  const handleDeleteArtisan = (art: ArtisanStaff) => {
    const next = artisans.filter((a) => a.id !== art.id);
    setArtisans(next);
    saveArtisans(next);
    fetch(
      `/api/admin/users?id=${encodeURIComponent(
        art.id
      )}&email=${encodeURIComponent(art.email)}`,
      { method: "DELETE" }
    ).catch(() => {});
    const logs = appendAuditLog({
      action: "team.user_deleted",
      actor: "Kudi Lasisi",
      role: "Plant Management",
      targetRef: art.email,
      summary: `Removed ${art.name} (${art.accessTier.toUpperCase()}) from roster.`,
    });
    setAuditLogs(logs);
    showToast(`Removed ${art.name} from roster.`);
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const updated: ProductionOrder = {
      ...editingOrder,
      totalQuoteNgn:
        editingOrder.exactQuantity * editingOrder.estimatedUnitCostNgn,
      updatedAt: new Date().toISOString(),
    };
    const next = orders.map((o) =>
      o.jobCode === updated.jobCode ? updated : o
    );
    setOrders(next);
    saveOrders(next);
    setEditingOrder(null);
    showToast(`Saved changes to order ${updated.jobCode}.`);
  };

  const handleDeleteOrder = (jobCode: string) => {
    const next = orders.filter((o) => o.jobCode !== jobCode);
    setOrders(next);
    saveOrders(next);
    showToast(`Deleted production order ${jobCode}.`);
  };

  const handleSaveInventoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventoryItem) return;
    const next = inventory.map((i) =>
      i.id === editingInventoryItem.id ? editingInventoryItem : i
    );
    setInventory(next);
    saveInventory(next);
    setEditingInventoryItem(null);
    showToast(`Updated material SKU ${editingInventoryItem.sku}.`);
  };

  const handleDeleteInventoryItem = (id: string, sku: string) => {
    const next = inventory.filter((i) => i.id !== id);
    setInventory(next);
    saveInventory(next);
    showToast(`Deleted material SKU ${sku}.`);
  };

  const handleSaveClientEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    const next = clients.map((c) =>
      c.id === editingClient.id ? editingClient : c
    );
    setClients(next);
    saveBrandClients(next);
    setEditingClient(null);
    showToast(`Updated B2B brand partner ${editingClient.brandName}.`);
  };

  const handleDeleteClient = (id: string, brandName: string) => {
    const next = clients.filter((c) => c.id !== id);
    setClients(next);
    saveBrandClients(next);
    showToast(`Removed ${brandName} from brand partners.`);
  };

  const handleDeleteExpense = (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    saveExpenses(next);
    showToast("Deleted expense entry.");
  };

  // --- Fabric Inventory & Supplier PO Handlers ---
  const handleGenerateAutoPo = (item: FabricInventoryItem) => {
    const recommendedQty = Math.max(
      item.reorderThreshold * 2 - item.stockLevel,
      Math.ceil(item.dailyBurnRate * 30)
    );
    const po: SupplierPurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        100 + Math.random() * 900
      )}`,
      supplierName: item.supplierName,
      materialSku: item.sku,
      materialName: item.name,
      quantityOrdered: recommendedQty,
      unit: item.unit,
      unitCostNgn: item.costPerUnitNgn,
      totalCostNgn: recommendedQty * item.costPerUnitNgn,
      status: "issued",
      createdAt: new Date().toISOString(),
    };
    const nextPos = [po, ...purchaseOrders];
    setPurchaseOrders(nextPos);
    savePurchaseOrders(nextPos);
    const logs = appendAuditLog({
      action: "procurement.po_issued",
      actor: "Materials Desk",
      role: "Materials Procurement",
      targetRef: po.poNumber,
      summary: `Issued Purchase Order ${po.poNumber} for ${recommendedQty} ${item.unit} of ${item.name} from ${item.supplierName} (₦${po.totalCostNgn.toLocaleString()}).`,
    });
    setAuditLogs(logs);
    showToast(
      `Issued ${po.poNumber} (${recommendedQty.toLocaleString()} ${item.unit}) to ${item.supplierName}.`
    );
  };

  const handleReceivePo = (po: SupplierPurchaseOrder) => {
    if (po.status === "received") return;
    const nextPos = purchaseOrders.map((p) =>
      p.id === po.id
        ? {
            ...p,
            status: "received" as const,
            receivedAt: new Date().toISOString(),
          }
        : p
    );
    setPurchaseOrders(nextPos);
    savePurchaseOrders(nextPos);

    const nextInv = inventory.map((item) =>
      item.sku === po.materialSku
        ? { ...item, stockLevel: item.stockLevel + po.quantityOrdered }
        : item
    );
    setInventory(nextInv);
    saveInventory(nextInv);

    const logs = appendAuditLog({
      action: "procurement.po_received",
      actor: "Kudi Lasisi (Plant Admin)",
      role: "Production Manager",
      targetRef: po.poNumber,
      summary: `Received ${po.quantityOrdered} ${po.unit} of ${po.materialName} into Lagos fabric store.`,
    });
    setAuditLogs(logs);
    showToast(
      `Received ${po.poNumber}: added +${po.quantityOrdered.toLocaleString()} ${po.unit} to stock!`
    );
  };

  // --- Brand Partner Handler ---
  const handleAddBrandClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.brandName.trim() || !newClient.email.trim()) return;
    const created: BrandClientCrm = {
      id: `crm-${Date.now()}`,
      brandName: newClient.brandName.trim(),
      contactName: newClient.contactName.trim() || "Brand Director",
      email: newClient.email.trim(),
      phone: newClient.phone.trim(),
      city: newClient.city.trim(),
      tier: "Emerging Label",
      lifetimeUnitsOrdered: 0,
      lifetimeSpendNgn: 0,
      loyaltyPoints: 100,
      discountRate: 0,
      lastOrderDate: new Date().toISOString().slice(0, 10),
    };
    const next = [created, ...clients];
    setClients(next);
    saveBrandClients(next);
    setNewClient({
      brandName: "",
      contactName: "",
      email: "",
      phone: "",
      city: "Lagos, Nigeria",
    });
    showToast(`Added ${created.brandName} to Brand Partner Directory.`);
  };

  // --- Finance & OpEx Handler ---
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newExpense.amountNgn);
    if (!newExpense.description.trim() || !(amount > 0)) return;
    const entry: FactoryExpense = {
      id: `exp-${Date.now()}`,
      category: newExpense.category,
      description: newExpense.description.trim(),
      amountNgn: amount,
      recordedBy: "Kudi Lasisi (Plant Admin)",
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...expenses];
    setExpenses(next);
    saveExpenses(next);
    const logs = appendAuditLog({
      action: "finance.expense_recorded",
      actor: "Kudi Lasisi",
      role: "Production Manager",
      targetRef: entry.category.toUpperCase(),
      summary: `Logged factory operating expense: ₦${amount.toLocaleString()} (${entry.description}).`,
    });
    setAuditLogs(logs);
    setNewExpense({
      category: "generator_diesel",
      description: "",
      amountNgn: "",
    });
    showToast(`Recorded ₦${amount.toLocaleString()} factory operating expense.`);
  };

  // --- Executive Telemetry Computations ---
  const grossRevenueNgn = orders.reduce((acc, o) => acc + o.totalQuoteNgn, 0);
  const estimatedCogsNgn = Math.round(grossRevenueNgn * 0.42);
  const grossProfitNgn = grossRevenueNgn - estimatedCogsNgn;
  const totalOpExNgn = expenses.reduce((acc, e) => acc + e.amountNgn, 0);
  const trueNetProfitNgn = grossProfitNgn - totalOpExNgn;
  const totalUnitsInPipeline = orders.reduce(
    (acc, o) => acc + o.exactQuantity,
    0
  );
  const totalUnitsPassedQc = orders.reduce(
    (acc, o) => acc + o.unitsPassedQc,
    0
  );
  const criticalFabricsCount = inventory.filter(
    (i) => i.stockLevel / Math.max(1, i.dailyBurnRate) < 12
  ).length;

  const handleExportAccountingCsv = () => {
    const rows = [
      ["Type", "Reference", "Entity / Category", "Units", "Amount (NGN)", "Status / Date"],
      ...orders.map((o) => [
        "PRODUCTION_REVENUE",
        o.jobCode,
        `"${o.company} (${o.garmentCategory})"`,
        String(o.exactQuantity),
        String(o.totalQuoteNgn),
        STAGE_METADATA[o.stage].shortLabel,
      ]),
      ...expenses.map((e) => [
        "FACTORY_OPEX",
        e.id,
        `"${e.category}: ${e.description}"`,
        "1",
        String(-e.amountNgn),
        e.createdAt.slice(0, 10),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miss-kudi-factory-pnl-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const patternDesigners = artisans.filter(
    (a) => a.role === "pattern_designer"
  );
  const tailors = artisans.filter((a) => a.role === "tailor");
  const qcInspectors = artisans.filter((a) => a.role === "quality_control");

  return (
    <main>
      <section
        className="section-wrap"
        style={{ paddingTop: 52, paddingBottom: 96 }}
      >
        {/* Top Workspace Header */}
        <div className="section-heading" style={{ marginBottom: 24 }}>
          <div>
            <h2>Artisan Floor, Fabric Runway &amp; Plant P&amp;L.</h2>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="button button-light"
              style={{ minHeight: 40, border: "1px solid var(--line)" }}
              onClick={() => setZReportModalOpen(true)}
            >
              <UiIcon name="print" size={14} /> Daily Summary
            </button>
            <button
              type="button"
              className="button button-dark"
              style={{ minHeight: 40 }}
              onClick={handleExportAccountingCsv}
            >
              Export P&amp;L Sheet
            </button>
          </div>
        </div>

        {notice && (
          <div className="mkp-banner mkp-banner-olive" style={{ marginBottom: 20 }}>
            {notice}
          </div>
        )}

        {/* Executive KPI Strip */}
        <div className="kpi-grid-4">
          <div className="kpi-card">
            <span className="ticket-label">Pipeline gross revenue</span>
            <div className="kpi-value mono">
              ₦{grossRevenueNgn.toLocaleString()}
            </div>
            <div className="kpi-sub">
              {orders.length} active runs ·{" "}
              {totalUnitsInPipeline.toLocaleString()} total garments
            </div>
          </div>

          <div className="kpi-card">
            <span className="ticket-label">Operating net profit</span>
            <div className="kpi-value mono" style={{ color: "var(--ink)" }}>
              ₦{trueNetProfitNgn.toLocaleString()}
            </div>
            <div className="kpi-sub">
              After ₦{estimatedCogsNgn.toLocaleString()} COGS &amp; ₦
              {totalOpExNgn.toLocaleString()} OpEx
            </div>
          </div>

          <div className="kpi-card">
            <span className="ticket-label">Artisan roster &amp; QC yield</span>
            <div className="kpi-value mono">
              {artisans.length} Specialists
            </div>
            <div className="kpi-sub">
              {totalUnitsPassedQc.toLocaleString()} pcs passed AQL 2.5 QC (98.9%
              avg yield)
            </div>
          </div>

          <div className="kpi-card">
            <span className="ticket-label">Fabric &amp; trim runway</span>
            <div className="kpi-value mono">
              {criticalFabricsCount} Low Runway
            </div>
            <div className="kpi-sub">
              30-day consumption forecast, mill POs ready
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Factory Operations Modules"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pipeline"}
            className={`workspace-tab-btn ${
              activeTab === "pipeline" ? "active" : ""
            }`}
            onClick={() => setActiveTab("pipeline")}
          >
            01. Floor &amp; QC ({orders.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "artisans"}
            className={`workspace-tab-btn ${
              activeTab === "artisans" ? "active" : ""
            }`}
            onClick={() => setActiveTab("artisans")}
          >
            02. Team Roster ({artisans.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "inventory"}
            className={`workspace-tab-btn ${
              activeTab === "inventory" ? "active" : ""
            }`}
            onClick={() => setActiveTab("inventory")}
          >
            03. Materials ({inventory.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "crm"}
            className={`workspace-tab-btn ${
              activeTab === "crm" ? "active" : ""
            }`}
            onClick={() => setActiveTab("crm")}
          >
            04. Brand Partners ({clients.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "finance"}
            className={`workspace-tab-btn ${
              activeTab === "finance" ? "active" : ""
            }`}
            onClick={() => setActiveTab("finance")}
          >
            05. P&amp;L Ledger
          </button>
        </div>

        {/* TAB 1: PRODUCTION FLOOR & QC CONSOLE */}
        {activeTab === "pipeline" && (
          <div className="workspace-panel">
            <div className="panel-header-row">
              <div>
                <h3>Active Production Orders &amp; Artisan Line Assignment</h3>
                <p>
                  Assign Pattern Designers, Master Tailors, and Quality Control
                  Inspectors to each run, log sewn batches, and print 80mm/A4
                  Job Tickets.
                </p>
              </div>
              <Link className="button button-dark" href="/quote" style={{ minHeight: 40 }}>
                + New Order
              </Link>
            </div>

            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable production data table"
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>Job Code &amp; Brand</th>
                    <th>Garment &amp; Qty</th>
                    <th>Stage</th>
                    <th>Pattern Designer</th>
                    <th>Master Tailor Lead</th>
                    <th>Quality Control (QC)</th>
                    <th>Floor &amp; QC Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.jobCode}>
                      <td>
                        <div className="mono" style={{ fontWeight: 700 }}>
                          {order.jobCode}
                        </div>
                        <div style={{ fontWeight: 600 }}>{order.company}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          Due: {order.targetDeliveryDate}
                        </div>
                      </td>
                      <td>
                        <div>{order.garmentCategory}</div>
                        <div className="mono" style={{ fontSize: 11 }}>
                          <strong>{order.exactQuantity.toLocaleString()} pcs</strong>{" "}
                          · ₦{order.totalQuoteNgn.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <select
                          aria-label={`Stage for ${order.jobCode}`}
                          className="table-select"
                          value={order.stage}
                          onChange={(e) =>
                            handleUpdateOrderStage(
                              order.jobCode,
                              e.target.value as ProductionStage
                            )
                          }
                        >
                          {Object.entries(STAGE_METADATA).map(([stKey, meta]) => (
                            <option key={stKey} value={stKey}>
                              {meta.stepNumber}. {meta.shortLabel}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`Pattern Designer for ${order.jobCode}`}
                          className="table-select"
                          value={order.assignedPatternDesigner}
                          onChange={(e) =>
                            handleAssignArtisan(
                              order.jobCode,
                              "assignedPatternDesigner",
                              e.target.value
                            )
                          }
                        >
                          {patternDesigners.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`Master Tailor for ${order.jobCode}`}
                          className="table-select"
                          value={order.assignedTailorLead}
                          onChange={(e) =>
                            handleAssignArtisan(
                              order.jobCode,
                              "assignedTailorLead",
                              e.target.value
                            )
                          }
                        >
                          {tailors.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`QC Inspector for ${order.jobCode}`}
                          className="table-select"
                          value={order.assignedQcInspector}
                          onChange={(e) =>
                            handleAssignArtisan(
                              order.jobCode,
                              "assignedQcInspector",
                              e.target.value
                            )
                          }
                        >
                          {qcInspectors.map((q) => (
                            <option key={q.id} value={q.name}>
                              {q.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="mono" style={{ fontSize: 11.5 }}>
                          Sewn: <strong>{order.unitsSewn}</strong> /{" "}
                          {order.exactQuantity}
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 11, color: "var(--ink)" }}
                        >
                          QC Passed: <strong>{order.unitsPassedQc}</strong> pcs
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() =>
                              handleLogFloorProgress(order.jobCode, 50)
                            }
                          >
                            +50 Sewn &amp; QC
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setEditingOrder(order)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => {
                              setSelectedTicketOrder(order);
                              setTicketModalOpen(true);
                            }}
                          >
                            <UiIcon name="print" size={13} /> Ticket
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn mkp-inline-btn-danger"
                            onClick={() => handleDeleteOrder(order.jobCode)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ARTISAN ROSTER (TAILORS, PATTERN DESIGNERS, CUTTING MASTERS & QC) */}
        {activeTab === "artisans" && (
          <div className="workspace-panel">
            <div className="panel-header-row">
              <div>
                <h3>
                  Artisan &amp; Specialist Roster: Pattern Designers, Cutting
                  Masters, Tailors &amp; Quality Control
                </h3>
                <p>
                  Live station assignments, monthly piece output, and First-Pass
                  Quality Control yield across Miss Kudi Productions’ Lagos
                  facility.
                </p>
              </div>
              <button
                type="button"
                className="button button-dark"
                style={{ minHeight: 40 }}
                onClick={() => setArtisanModalOpen(true)}
              >
                + Add Specialist
              </button>
            </div>

            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable production data table"
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>Specialist / Admin Name</th>
                    <th>Access Level &amp; Role</th>
                    <th>Assigned Station / Line</th>
                    <th>Technical Specialty</th>
                    <th>Active Runs</th>
                    <th>Monthly Output</th>
                    <th>QC First-Pass Yield</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {artisans.map((art) => (
                    <tr key={art.id}>
                      <td>
                        <strong>{art.name}</strong>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          {art.email}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <span className="size-pill-item">
                            {art.accessTier.toUpperCase()}
                          </span>
                          <span className="mkp-badge mkp-badge-olive">
                            {ARTISAN_ROLE_LABELS[art.role]}
                          </span>
                        </div>
                      </td>
                      <td>{art.station}</td>
                      <td style={{ maxWidth: 260 }}>{art.specialty}</td>
                      <td className="mono">{art.activeRuns} runs</td>
                      <td className="mono">
                        <strong>
                          {art.unitsCompletedMonth.toLocaleString()} pcs
                        </strong>
                      </td>
                      <td className="mono" style={{ color: "var(--ink)" }}>
                        <strong>{art.qcPassRate.toFixed(1)}%</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setEditingArtisan(art)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn mkp-inline-btn-danger"
                            onClick={() => handleDeleteArtisan(art)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FABRIC & TRIM RUNWAY + SUPPLIER PURCHASE ORDERS */}
        {activeTab === "inventory" && (
          <div className="workspace-panel">
            <div className="panel-header-row">
              <div>
                <h3>
                  Fabric Roll &amp; Trim Runway &amp; Supplier Purchase Orders
                </h3>
                <p>
                  Monitors daily cutting table consumption (meters/day),
                  calculates remaining stock runway, and issues replenishment
                  Purchase Orders to textile mills.
                </p>
              </div>
            </div>

            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable production data table"
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>SKU &amp; Lot</th>
                    <th>Material / Trim Description</th>
                    <th>Current Stock</th>
                    <th>Daily Consumption</th>
                    <th>Runway Left</th>
                    <th>Urgency</th>
                    <th>Preferred Textile Supplier</th>
                    <th>Supplier PO</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const daysLeft =
                      item.stockLevel / Math.max(1, item.dailyBurnRate);
                    const status =
                      daysLeft < 7
                        ? "Critical"
                        : daysLeft < 14
                        ? "Reorder soon"
                        : "Healthy";
                    return (
                      <tr key={item.id}>
                        <td className="mono">
                          <strong>{item.sku}</strong>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>
                            {item.batchLot}
                          </div>
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>
                            {item.category} · ₦
                            {item.costPerUnitNgn.toLocaleString()}/{item.unit}
                          </div>
                        </td>
                        <td className="mono">
                          <strong>
                            {item.stockLevel.toLocaleString()} {item.unit}
                          </strong>
                        </td>
                        <td className="mono">
                          {item.dailyBurnRate} {item.unit}/day
                        </td>
                        <td className="mono">
                          <strong>{daysLeft.toFixed(1)} days</strong>
                        </td>
                        <td>
                          <span
                            className={`mkp-badge ${
                              status === "Critical"
                                ? "mkp-badge-critical"
                                : status === "Reorder soon"
                                ? "mkp-badge-warn"
                                : "mkp-badge-olive"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td>{item.supplierName}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="button button-dark"
                              style={{ minHeight: 34, padding: "0 12px", fontSize: 10 }}
                              onClick={() => handleGenerateAutoPo(item)}
                            >
                              Issue PO
                            </button>
                            <button
                              type="button"
                              className="mkp-inline-btn"
                              onClick={() => setEditingInventoryItem(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="mkp-inline-btn mkp-inline-btn-danger"
                              onClick={() =>
                                handleDeleteInventoryItem(item.id, item.sku)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Issued Purchase Orders */}
            <h4 style={{ marginTop: 32, marginBottom: 12 }}>
              Supplier Purchase Orders (Textile Mills &amp; Trim Vendors)
            </h4>
            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable production data table"
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Material</th>
                    <th>Order Quantity</th>
                    <th>Total Cost</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="mono">
                        <strong>{po.poNumber}</strong>
                      </td>
                      <td>{po.supplierName}</td>
                      <td>{po.materialName}</td>
                      <td className="mono">
                        {po.quantityOrdered.toLocaleString()} {po.unit}
                      </td>
                      <td className="mono">
                        <strong>₦{po.totalCostNgn.toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className="mkp-badge mkp-badge-olive">
                          {po.status}
                        </span>
                      </td>
                      <td>
                        {po.status === "issued" ? (
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => handleReceivePo(po)}
                          >
                            Receive Stock
                          </button>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>
                            Received{" "}
                            {po.receivedAt
                              ? new Date(po.receivedAt).toLocaleDateString()
                              : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: B2B FASHION BRAND PARTNERS & VOLUME TIERS */}
        {activeTab === "crm" && (
          <div className="workspace-panel">
            <div className="panel-header-row">
              <div>
                <h3>
                  B2B Fashion Brand Partners, Volume Tiers &amp; Contract Codes
                </h3>
                <p>
                  Tracks lifetime garment volume, automatic B2B tier discounts
                  (Emerging, Studio 3%, Collection 7%, Heritage VIP 12%), and
                  active partner codes.
                </p>
              </div>
            </div>

            <div className="crm-promos-strip">
              {Object.values(PROMO_CODES).map((p) => (
                <div key={p.code} className="crm-promo-card">
                  <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>
                    {p.code}
                  </span>
                  <span style={{ fontSize: 11 }}>{p.label}</span>
                  <small style={{ color: "var(--muted)", fontSize: 10 }}>
                    Min. Order: {p.minUnits} pieces
                  </small>
                </div>
              ))}
            </div>

            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable B2B partner directory table"
              style={{ marginTop: 20 }}
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>Fashion Brand</th>
                    <th>Primary Contact</th>
                    <th>Location</th>
                    <th>B2B Partner Tier</th>
                    <th>Lifetime Volume</th>
                    <th>Lifetime Production Spend</th>
                    <th>Contract Discount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.brandName}</strong>
                      </td>
                      <td>
                        <div>{c.contactName}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          {c.email}
                        </div>
                      </td>
                      <td>{c.city}</td>
                      <td>
                        <span className="mkp-badge mkp-badge-olive">
                          {c.tier}
                        </span>
                      </td>
                      <td className="mono">
                        <strong>
                          {c.lifetimeUnitsOrdered.toLocaleString()} pcs
                        </strong>
                      </td>
                      <td className="mono">
                        ₦{c.lifetimeSpendNgn.toLocaleString()}
                      </td>
                      <td className="mono">
                        <strong>{c.discountRate}% off</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setEditingClient(c)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn mkp-inline-btn-danger"
                            onClick={() => handleDeleteClient(c.id, c.brandName)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={handleAddBrandClient}
              className="inline-workspace-form"
              style={{ marginTop: 24 }}
            >
              <h4 style={{ margin: "0 0 12px" }}>
                Register New B2B Fashion Brand Partner
              </h4>
              <div className="grading-controls-grid">
                <input
                  required
                  placeholder="Fashion Brand Name *"
                  value={newClient.brandName}
                  onChange={(e) =>
                    setNewClient((p) => ({ ...p, brandName: e.target.value }))
                  }
                />
                <input
                  placeholder="Production Contact Name"
                  value={newClient.contactName}
                  onChange={(e) =>
                    setNewClient((p) => ({ ...p, contactName: e.target.value }))
                  }
                />
                <input
                  type="email"
                  required
                  placeholder="Brand Email *"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                className="button button-dark"
                style={{ minHeight: 38, marginTop: 12 }}
              >
                Add Brand Partner
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: FACTORY OPEX LEDGER, P&L & ACTIVITY LOG */}
        {activeTab === "finance" && (
          <div className="workspace-panel">
            <div className="panel-header-row">
              <div>
                <h3>
                  Lagos Factory Operating Expenses (OpEx), Net Profit &amp;
                  Activity Log
                </h3>
                <p>
                  Reconciles production revenue against fabric COGS and factory
                  operating costs (generator diesel, Juki machine maintenance,
                  artisan payroll, EKEDC power).
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAddExpense}
              className="inline-workspace-form"
              style={{ marginBottom: 24 }}
            >
              <h4 style={{ margin: "0 0 12px" }}>
                Record Factory Operating Expense (OpEx)
              </h4>
              <div className="grading-controls-grid">
                <select
                  aria-label="Expense category"
                  value={newExpense.category}
                  onChange={(e) =>
                    setNewExpense((p) => ({
                      ...p,
                      category: e.target.value as FactoryExpense["category"],
                    }))
                  }
                >
                  <option value="generator_diesel">
                    Generator Diesel (AGO)
                  </option>
                  <option value="artisan_payroll">
                    Artisan Payroll (Tailors / Pattern / QC)
                  </option>
                  <option value="machinery_maintenance">
                    Sewing &amp; Cutting Machine Maintenance
                  </option>
                  <option value="phcn_utilities">
                    EKEDC Power &amp; Steam Pressing Utilities
                  </option>
                  <option value="qc_packaging">
                    QC Polybags, Hangers &amp; Export Cartons
                  </option>
                  <option value="fabric_logistics">
                    Fabric Mill Haulage &amp; Clearing
                  </option>
                </select>
                <input
                  required
                  placeholder="Expense description (e.g. 500L Diesel delivery)"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
                <input
                  type="number"
                  required
                  min={100}
                  placeholder="Amount in NGN (₦)"
                  value={newExpense.amountNgn}
                  onChange={(e) =>
                    setNewExpense((p) => ({ ...p, amountNgn: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                className="button button-dark"
                style={{ minHeight: 38, marginTop: 12 }}
              >
                Log Expense
              </button>
            </form>

            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable production data table"
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Recorded By</th>
                    <th>Amount (NGN)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="mono">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="size-pill-item">
                          {exp.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>{exp.description}</td>
                      <td>{exp.recordedBy}</td>
                      <td className="mono">
                        <strong>₦{exp.amountNgn.toLocaleString()}</strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="mkp-inline-btn mkp-inline-btn-danger"
                          onClick={() => handleDeleteExpense(exp.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 style={{ marginTop: 36, marginBottom: 12 }}>
              Factory &amp; Quality Activity Log
            </h4>
            <div
              className="table-scroll-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable production data table"
            >
              <table className="size-chart workspace-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Action</th>
                    <th>Actor &amp; Specialist Role</th>
                    <th>Target Ref</th>
                    <th>Audit Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="mono" style={{ fontSize: 10.5 }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="mono">
                        <strong>{log.action}</strong>
                      </td>
                      <td>
                        <strong>{log.actor}</strong>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          {log.role}
                        </div>
                      </td>
                      <td className="mono">{log.targetRef}</td>
                      <td>{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Printable Job Ticket Modal */}
      <ProductionJobTicketModal
        order={selectedTicketOrder}
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
      />

      {/* Onboard New Superadmin / Admin / Artisan Modal */}
      <ModalDialog
        open={artisanModalOpen}
        onClose={() => setArtisanModalOpen(false)}
        title="Add Plant Manager or Technical Specialist"
        maxWidth={540}
      >
        <form className="quote-form" style={{ padding: 0, boxShadow: "none" }} onSubmit={handleCreateArtisan}>
          <div className="form-row">
            <label>
              Access level *
              <select
                value={newArtisan.accessTier}
                onChange={(e) =>
                  setNewArtisan((p) => ({
                    ...p,
                    accessTier: e.target.value as UserAccessTier,
                  }))
                }
              >
                <option value="staff">Staff (Artisan / Specialist)</option>
                <option value="admin">Admin (Factory Plant Manager)</option>
                <option value="superadmin">Superadmin (Global HQ)</option>
              </select>
            </label>
            <label>
              Specialist Role *
              <select
                value={newArtisan.role}
                onChange={(e) =>
                  setNewArtisan((p) => ({
                    ...p,
                    role: e.target.value as ArtisanRole,
                  }))
                }
              >
                <option value="tailor">Master Tailor / Sewing Lead</option>
                <option value="pattern_designer">Pattern Designer</option>
                <option value="quality_control">
                  Quality Control (QC) Inspector
                </option>
                <option value="cutting_master">Cutting Master</option>
                <option value="production_manager">Production Manager</option>
              </select>
            </label>
          </div>
          <label>
            Full Name *
            <input
              required
              placeholder="e.g. Adebayo Adeleke"
              value={newArtisan.name}
              onChange={(e) =>
                setNewArtisan((p) => ({ ...p, name: e.target.value }))
              }
            />
          </label>
          <div className="form-row">
            <label>
              Work Email *
              <input
                type="email"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="specialist@misskudi.com"
                value={newArtisan.email}
                onChange={(e) =>
                  setNewArtisan((p) => ({ ...p, email: e.target.value }))
                }
              />
            </label>
            <label>
              Assigned Station / Line *
              <input
                required
                placeholder="e.g. Sewing Line 4 or QC Bay 2"
                value={newArtisan.station}
                onChange={(e) =>
                  setNewArtisan((p) => ({ ...p, station: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Initial Password
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 400,
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                8+ characters (optional, or send a password reset code)
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Set initial sign-in password"
                value={newArtisan.password}
                onChange={(e) =>
                  setNewArtisan((p) => ({ ...p, password: e.target.value }))
                }
              />
            </label>
            <label>
              Technical Specialty &amp; Machinery
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 400,
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                Assigned CAD, cutting, sewing, or QC station focus
              </span>
              <input
                placeholder="e.g. Gerber CAD Grading, Heavy Denim Lockstitch"
                value={newArtisan.specialty}
                onChange={(e) =>
                  setNewArtisan((p) => ({ ...p, specialty: e.target.value }))
                }
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button type="submit" className="button button-dark" style={{ flex: 1 }}>
              Add Account to Roster
            </button>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => setArtisanModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Edit Order Modal */}
      <ModalDialog
        open={Boolean(editingOrder)}
        onClose={() => setEditingOrder(null)}
        title={`Edit Production Order: ${editingOrder?.jobCode || ""}`}
        maxWidth={560}
      >
        {editingOrder && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none" }}
            onSubmit={handleSaveOrderEdit}
          >
            <div className="form-row">
              <label>
                Fashion Brand / Client *
                <input
                  required
                  value={editingOrder.company}
                  onChange={(e) =>
                    setEditingOrder({ ...editingOrder, company: e.target.value })
                  }
                />
              </label>
              <label>
                Exact Quantity (Pieces) *
                <input
                  type="number"
                  min={10}
                  required
                  value={editingOrder.exactQuantity}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      exactQuantity: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Unit Rate (NGN ₦) *
                <input
                  type="number"
                  min={500}
                  required
                  value={editingOrder.estimatedUnitCostNgn}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      estimatedUnitCostNgn: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Target Delivery Date
                <input
                  type="date"
                  value={editingOrder.targetDeliveryDate}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      targetDeliveryDate: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="submit"
                className="button button-dark"
                style={{ flex: 1 }}
              >
                Save Order Changes
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => setEditingOrder(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Edit Superadmin / Admin / Artisan Modal */}
      <ModalDialog
        open={Boolean(editingArtisan)}
        onClose={() => {
          setEditArtisanPassword("");
          setEditingArtisan(null);
        }}
        title={`Edit Account: ${editingArtisan?.name || ""}`}
        maxWidth={540}
      >
        {editingArtisan && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none" }}
            onSubmit={handleSaveArtisanEdit}
          >
            <div className="form-row">
              <label>
                Access level *
                <select
                  value={editingArtisan.accessTier}
                  onChange={(e) =>
                    setEditingArtisan({
                      ...editingArtisan,
                      accessTier: e.target.value as UserAccessTier,
                    })
                  }
                >
                  <option value="superadmin">Superadmin (Global HQ)</option>
                  <option value="admin">Admin (Factory Plant Manager)</option>
                  <option value="staff">Staff (Artisan / Specialist)</option>
                </select>
              </label>
              <label>
                Specialist Role *
                <select
                  value={editingArtisan.role}
                  onChange={(e) =>
                    setEditingArtisan({
                      ...editingArtisan,
                      role: e.target.value as ArtisanRole,
                    })
                  }
                >
                  <option value="production_manager">Production Manager</option>
                  <option value="pattern_designer">Pattern Designer</option>
                  <option value="cutting_master">Cutting Master</option>
                  <option value="tailor">Master Tailor / Sewing Lead</option>
                  <option value="quality_control">
                    Quality Control (QC) Inspector
                  </option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Full Name *
                <input
                  required
                  value={editingArtisan.name}
                  onChange={(e) =>
                    setEditingArtisan({
                      ...editingArtisan,
                      name: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Email *
                <input
                  type="email"
                  required
                  value={editingArtisan.email}
                  onChange={(e) =>
                    setEditingArtisan({
                      ...editingArtisan,
                      email: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Station / Office *
                <input
                  required
                  value={editingArtisan.station}
                  onChange={(e) =>
                    setEditingArtisan({
                      ...editingArtisan,
                      station: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                QC Pass Rate (%)
                <input
                  type="number"
                  step="0.1"
                  min={50}
                  max={100}
                  value={editingArtisan.qcPassRate}
                  onChange={(e) =>
                    setEditingArtisan({
                      ...editingArtisan,
                      qcPassRate: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              Set / Reset Sign-In Password (Optional)
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 400,
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                Minimum 8 characters (clears any failed-login lockout), or{" "}
                <Link
                  href={`/reset-password?email=${encodeURIComponent(
                    editingArtisan.email
                  )}`}
                  style={{ textDecoration: "underline", color: "var(--ink)" }}
                >
                  open password recovery
                </Link>
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Leave blank to keep existing password"
                value={editArtisanPassword}
                onChange={(e) => setEditArtisanPassword(e.target.value)}
              />
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="submit"
                className="button button-dark"
                style={{ flex: 1 }}
              >
                Save Account Changes
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => {
                  setEditArtisanPassword("");
                  setEditingArtisan(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Edit Inventory SKU Modal */}
      <ModalDialog
        open={Boolean(editingInventoryItem)}
        onClose={() => setEditingInventoryItem(null)}
        title={`Edit Material SKU: ${editingInventoryItem?.sku || ""}`}
        maxWidth={520}
      >
        {editingInventoryItem && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none" }}
            onSubmit={handleSaveInventoryEdit}
          >
            <label>
              Material Name *
              <input
                required
                value={editingInventoryItem.name}
                onChange={(e) =>
                  setEditingInventoryItem({
                    ...editingInventoryItem,
                    name: e.target.value,
                  })
                }
              />
            </label>
            <div className="form-row">
              <label>
                Current Stock ({editingInventoryItem.unit}) *
                <input
                  type="number"
                  min={0}
                  required
                  value={editingInventoryItem.stockLevel}
                  onChange={(e) =>
                    setEditingInventoryItem({
                      ...editingInventoryItem,
                      stockLevel: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Daily Burn Rate ({editingInventoryItem.unit}/day) *
                <input
                  type="number"
                  min={1}
                  required
                  value={editingInventoryItem.dailyBurnRate}
                  onChange={(e) =>
                    setEditingInventoryItem({
                      ...editingInventoryItem,
                      dailyBurnRate: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="submit"
                className="button button-dark"
                style={{ flex: 1 }}
              >
                Save SKU Changes
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => setEditingInventoryItem(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Edit Brand Client Modal */}
      <ModalDialog
        open={Boolean(editingClient)}
        onClose={() => setEditingClient(null)}
        title={`Edit B2B Partner: ${editingClient?.brandName || ""}`}
        maxWidth={520}
      >
        {editingClient && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none" }}
            onSubmit={handleSaveClientEdit}
          >
            <div className="form-row">
              <label>
                Brand Name *
                <input
                  required
                  value={editingClient.brandName}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      brandName: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Partner Tier
                <select
                  value={editingClient.tier}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      tier: e.target.value as BrandClientCrm["tier"],
                    })
                  }
                >
                  <option value="Emerging Label">Emerging Label</option>
                  <option value="Studio Partner (3% Off)">
                    Studio Partner (3% Off)
                  </option>
                  <option value="Collection Partner (7% Off)">
                    Collection Partner (7% Off)
                  </option>
                  <option value="Heritage VIP (12% Off)">
                    Heritage VIP (12% Off)
                  </option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Contact Name
                <input
                  value={editingClient.contactName}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      contactName: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Discount Rate (%)
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={editingClient.discountRate}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      discountRate: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="submit"
                className="button button-dark"
                style={{ flex: 1 }}
              >
                Save Partner Changes
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => setEditingClient(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Printable Factory Daily Summary Modal */}
      <ModalDialog
        open={zReportModalOpen}
        onClose={() => setZReportModalOpen(false)}
        title="End-of-Day Production, Quality & P&L Summary"
        maxWidth={560}
      >
        <div className="job-ticket-sheet">
          <div className="job-ticket-top">
            <div>
              <div className="wordmark-main" style={{ fontSize: 18 }}>
                Miss Kudi Productions
              </div>
              <div className="wordmark-sub">
                Daily production summary, Surulere, Lagos
              </div>
            </div>
            <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              <div>SUM-{new Date().toISOString().slice(0, 10)}</div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          <hr className="ticket-divider" />

          <div className="ticket-label">
            1. Sewing floor &amp; quality control summary
          </div>
          <table className="ticket-size-table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th>Active Runs</th>
                <th>Total Pipeline Units</th>
                <th>Units Passed QC</th>
                <th>Avg QC Yield</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{orders.length}</td>
                <td>{totalUnitsInPipeline.toLocaleString()} pcs</td>
                <td>{totalUnitsPassedQc.toLocaleString()} pcs</td>
                <td>98.9%</td>
              </tr>
            </tbody>
          </table>

          <div className="ticket-label" style={{ marginTop: 14 }}>
            2. Artisan department breakdown
          </div>
          <div style={{ fontSize: 11.5, display: "grid", gap: 4, marginTop: 6 }}>
            <div>
              <strong>Pattern Designers:</strong> {patternDesigners.length} active (
              {patternDesigners.map((p) => p.name).join(", ")})
            </div>
            <div>
              <strong>Master Tailors / Sewing Lines:</strong> {tailors.length} leads (
              {tailors.map((t) => t.name).join(", ")})
            </div>
            <div>
              <strong>Quality Control (QC) Inspectors:</strong>{" "}
              {qcInspectors.length} active (
              {qcInspectors.map((q) => q.name).join(", ")})
            </div>
          </div>

          <hr className="ticket-divider" />

          <div className="ticket-label">
            3. Financial &amp; operating expense reconciliation
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 12, marginTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Gross Pipeline Production Value:</span>
              <strong className="mono">
                ₦{grossRevenueNgn.toLocaleString()}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Estimated Fabric &amp; Trim COGS (42%):</span>
              <span className="mono">
                -₦{estimatedCogsNgn.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Factory Operating Expenses (Diesel, Payroll, Power):</span>
              <span className="mono">-₦{totalOpExNgn.toLocaleString()}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--line)",
                paddingTop: 6,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              <span>Operating net profit:</span>
              <span className="mono">
                ₦{trueNetProfitNgn.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div
          className="no-print"
          style={{ display: "flex", gap: 10, marginTop: 16 }}
        >
          <button
            type="button"
            className="button button-dark"
            style={{ flex: 1, minHeight: 40 }}
            onClick={() => window.print()}
          >
            <UiIcon name="print" size={14} /> Print Summary
          </button>
          <button
            type="button"
            className="button button-light"
            style={{ border: "1px solid var(--line)", minHeight: 40 }}
            onClick={() => setZReportModalOpen(false)}
          >
            Close
          </button>
        </div>
      </ModalDialog>
    </main>
  );
}
