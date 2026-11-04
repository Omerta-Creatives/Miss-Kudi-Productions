"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACCESS_TIER_LABELS,
  appendAuditLog,
  ARTISAN_ROLE_LABELS,
  ArtisanRole,
  ArtisanStaff,
  calculateProductionEstimate,
  canManageFactory,
  computeDefaultSizeBreakdown,
  FabricInventoryItem,
  FactoryBranch,
  getActiveBranchId,
  getCurrentSessionUser,
  isStaffUser,
  isSuperAdminUser,
  loadArtisans,
  loadBranches,
  loadInventory,
  loadOrders,
  ProductionOrder,
  ProductionStage,
  saveArtisans,
  saveInventory,
  saveLocalPasswordHash,
  saveOrders,
  setActiveBranchId,
  setCurrentSessionUser,
  STAGE_METADATA,
  UserAccessTier,
} from "../lib/production-os";
import {
  ModalDialog,
  ProductionJobTicketModal,
} from "../components/ProductionJobTicketModal";

export default function RoleDashboardPage() {
  const [user, setUser] = useState<ArtisanStaff>(() => getCurrentSessionUser());
  const [branches, setBranches] = useState<FactoryBranch[]>([]);
  const [activeBranchId, setBranchId] = useState<string>(() =>
    getActiveBranchId()
  );
  const [artisans, setArtisans] = useState<ArtisanStaff[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [inventory, setInventory] = useState<FabricInventoryItem[]>([]);
  const [showAllFloorRuns, setShowAllFloorRuns] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "overview" | "orders" | "roster" | "inventory"
  >("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null
  );
  const [ticketOpen, setTicketOpen] = useState(false);
  const [notice, setNotice] = useState("");

  // Admin CRUD Modals — Production Orders
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(
    null
  );

  // Admin CRUD Modals — Admin / Staff Roster
  const [createStaffModalOpen, setCreateStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ArtisanStaff | null>(null);

  // Admin CRUD Modals — Fabric & Trim Inventory
  const [createSkuModalOpen, setCreateSkuModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<FabricInventoryItem | null>(
    null
  );

  // Form states for Create Modals
  const [newOrderForm, setNewOrderForm] = useState({
    company: "",
    email: "",
    phone: "",
    garmentCategory: "Tops / shirts",
    exactQuantity: 200,
    specificationsReady: "Yes — Tech pack / graded pattern ready",
    targetDeliveryDate: new Date(Date.now() + 28 * 86400000)
      .toISOString()
      .slice(0, 10),
    details: "Bulk cut-and-sew production run with AQL 2.5 final inspection.",
  });

  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    accessTier: "admin" as UserAccessTier,
    role: "production_manager" as ArtisanRole,
    station: "Planning Office 1",
    specialty: "Plant Scheduling, Merchandising & Quality Oversight",
    shiftStatus: "CLOCKED_IN" as ArtisanStaff["shiftStatus"],
  });
  const [editStaffPassword, setEditStaffPassword] = useState("");

  const [newSkuForm, setNewSkuForm] = useState({
    sku: "",
    name: "",
    category: "Fabric Roll" as FabricInventoryItem["category"],
    unit: "meters" as FabricInventoryItem["unit"],
    stockLevel: 500,
    reorderThreshold: 600,
    dailyBurnRate: 45,
    costPerUnitNgn: 4200,
    supplierName: "Lagos Island Textile Mills",
    batchLot: `LOT-LOS-${new Date().getFullYear()}-01`,
  });

  const syncDashboard = () => {
    setUser(getCurrentSessionUser());
    setBranches(loadBranches());
    setBranchId(getActiveBranchId());
    setArtisans(loadArtisans());
    setOrders(loadOrders());
    setInventory(loadInventory());
  };

  useEffect(() => {
    syncDashboard();
    window.addEventListener("mkp:session-change", syncDashboard);
    window.addEventListener("mkp:branch-change", syncDashboard);
    return () => {
      window.removeEventListener("mkp:session-change", syncDashboard);
      window.removeEventListener("mkp:branch-change", syncDashboard);
    };
  }, []);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 5000);
  };

  const isStaff = isStaffUser(user);
  const isManager = canManageFactory(user);
  const isSuper = isSuperAdminUser(user);

  const activeBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0];

  // Toggle shift clock-in for Staff
  const handleToggleShift = () => {
    const nextShift =
      user.shiftStatus === "CLOCKED_IN" ? "OFF_SHIFT" : "CLOCKED_IN";
    const updatedUser: ArtisanStaff = { ...user, shiftStatus: nextShift };
    const nextArtisans = artisans.map((a) =>
      a.id === user.id ? updatedUser : a
    );
    setArtisans(nextArtisans);
    saveArtisans(nextArtisans);
    setCurrentSessionUser(updatedUser);
    appendAuditLog({
      action: nextShift === "CLOCKED_IN" ? "shift.clock_in" : "shift.clock_out",
      actor: user.name,
      role: `Staff · ${ARTISAN_ROLE_LABELS[user.role]}`,
      targetRef: user.station,
      summary: `${user.name} (${ARTISAN_ROLE_LABELS[user.role]}) ${
        nextShift === "CLOCKED_IN" ? "clocked in to" : "clocked out from"
      } ${user.station}.`,
    });
    showToast(
      `Shift status updated: ${
        nextShift === "CLOCKED_IN"
          ? "CLOCKED IN (Active on Station)"
          : "OFF SHIFT"
      }`
    );
  };

  // Staff role-specific batch action on an order
  const handleStaffBatchAction = (
    order: ProductionOrder,
    actionType: "approve_pattern" | "log_cutting" | "log_sewing" | "pass_qc"
  ) => {
    const nextOrders = orders.map((o) => {
      if (o.jobCode !== order.jobCode) return o;
      if (actionType === "approve_pattern") {
        return {
          ...o,
          stage: "03_approved" as ProductionStage,
          updatedAt: new Date().toISOString(),
        };
      }
      if (actionType === "log_cutting") {
        return {
          ...o,
          stage: "04_production_qc" as ProductionStage,
          updatedAt: new Date().toISOString(),
        };
      }
      if (actionType === "log_sewing") {
        const newSewn = Math.min(o.exactQuantity, o.unitsSewn + 50);
        return {
          ...o,
          stage: "04_production_qc" as ProductionStage,
          unitsSewn: newSewn,
          updatedAt: new Date().toISOString(),
        };
      }
      const newSewn = Math.max(
        o.unitsSewn,
        Math.min(o.exactQuantity, o.unitsPassedQc + 50)
      );
      const newPassed = Math.min(newSewn, o.unitsPassedQc + 50);
      const nextStage: ProductionStage =
        newPassed >= o.exactQuantity ? "05_dispatch" : "04_production_qc";
      return {
        ...o,
        unitsSewn: newSewn,
        unitsPassedQc: newPassed,
        stage: nextStage,
        updatedAt: new Date().toISOString(),
      };
    });

    setOrders(nextOrders);
    saveOrders(nextOrders);

    const updatedUser: ArtisanStaff = {
      ...user,
      unitsCompletedMonth: user.unitsCompletedMonth + 50,
    };
    const nextArtisans = artisans.map((a) =>
      a.id === user.id ? updatedUser : a
    );
    setArtisans(nextArtisans);
    saveArtisans(nextArtisans);
    setCurrentSessionUser(updatedUser);

    appendAuditLog({
      action: `staff.${actionType}`,
      actor: user.name,
      role: `Staff · ${ARTISAN_ROLE_LABELS[user.role]}`,
      targetRef: order.jobCode,
      summary: `${user.name} (${ARTISAN_ROLE_LABELS[user.role]}) executed ${actionType.replace(
        "_",
        " "
      )} on ${order.company} (${order.jobCode}).`,
    });

    showToast(
      `Recorded ${actionType.replace("_", " ")} on ${order.jobCode} (${
        order.company
      })!`
    );
  };

  // --- ADMIN / SUPERADMIN CRUD: PRODUCTION ORDERS ---
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.company.trim() || !newOrderForm.email.trim()) return;
    const qty = Math.max(20, Number(newOrderForm.exactQuantity) || 100);
    const est = calculateProductionEstimate({
      garmentCategory: newOrderForm.garmentCategory,
      exactQuantity: qty,
      specificationsReady: newOrderForm.specificationsReady,
    });
    const created: ProductionOrder = {
      id: `ord-${Date.now()}`,
      jobCode: `MKP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      offlineId: `mkp-admin-${Date.now()}`,
      branchId: activeBranch?.id || "br-yaba",
      company: newOrderForm.company.trim(),
      email: newOrderForm.email.trim().toLowerCase(),
      phone: newOrderForm.phone.trim(),
      garmentCategory: newOrderForm.garmentCategory,
      quantityBracket: qty >= 1000 ? "1,000–4,999 pieces" : "100–499 pieces",
      exactQuantity: qty,
      specificationsReady: newOrderForm.specificationsReady,
      details: newOrderForm.details.trim(),
      stage: "02_quotation",
      sizeBreakdown: computeDefaultSizeBreakdown(qty),
      estimatedUnitCostNgn: est.estimatedUnitCostNgn,
      totalQuoteNgn: est.totalQuoteNgn,
      estimatedFabricMeters: est.estimatedFabricMeters,
      estimatedLeadWeeks: est.estimatedLeadWeeks,
      discountPercent: est.combinedDiscountPercent,
      assignedPatternDesigner: est.assignedPatternDesigner,
      assignedTailorLead: est.assignedTailorLead,
      assignedQcInspector: est.assignedQcInspector,
      unitsSewn: 0,
      unitsPassedQc: 0,
      unitsRework: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetDeliveryDate: newOrderForm.targetDeliveryDate,
    };

    const next = [created, ...orders];
    setOrders(next);
    saveOrders(next);
    appendAuditLog({
      action: "order.created",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: created.jobCode,
      summary: `Created production run ${created.jobCode} for ${created.company} (${created.exactQuantity} pcs · ₦${created.totalQuoteNgn.toLocaleString()}).`,
    });
    setCreateOrderModalOpen(false);
    setNewOrderForm({
      company: "",
      email: "",
      phone: "",
      garmentCategory: "Tops / shirts",
      exactQuantity: 200,
      specificationsReady: "Yes — Tech pack / graded pattern ready",
      targetDeliveryDate: new Date(Date.now() + 28 * 86400000)
        .toISOString()
        .slice(0, 10),
      details: "Bulk cut-and-sew production run with AQL 2.5 final inspection.",
    });
    showToast(`Created production order ${created.jobCode} (${created.company})!`);
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const updatedOrder: ProductionOrder = {
      ...editingOrder,
      totalQuoteNgn:
        editingOrder.exactQuantity * editingOrder.estimatedUnitCostNgn,
      updatedAt: new Date().toISOString(),
    };
    const next = orders.map((o) =>
      o.jobCode === updatedOrder.jobCode ? updatedOrder : o
    );
    setOrders(next);
    saveOrders(next);
    appendAuditLog({
      action: "order.updated",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: updatedOrder.jobCode,
      summary: `Updated order ${updatedOrder.jobCode} (${updatedOrder.company}) — ${updatedOrder.exactQuantity} pcs, Stage: ${STAGE_METADATA[updatedOrder.stage].shortLabel}.`,
    });
    setEditingOrder(null);
    showToast(`Saved changes to order ${updatedOrder.jobCode}.`);
  };

  const handleDeleteOrder = (order: ProductionOrder) => {
    const next = orders.filter((o) => o.jobCode !== order.jobCode);
    setOrders(next);
    saveOrders(next);
    appendAuditLog({
      action: "order.deleted",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: order.jobCode,
      summary: `Deleted production order ${order.jobCode} (${order.company}).`,
    });
    showToast(`Deleted production order ${order.jobCode}.`);
  };

  const handleUpdateOrderStage = (jobCode: string, newStage: ProductionStage) => {
    const next = orders.map((o) =>
      o.jobCode === jobCode
        ? { ...o, stage: newStage, updatedAt: new Date().toISOString() }
        : o
    );
    setOrders(next);
    saveOrders(next);
    appendAuditLog({
      action: "order.stage_updated",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: jobCode,
      summary: `Moved ${jobCode} to Stage ${STAGE_METADATA[newStage].stepNumber} (${STAGE_METADATA[newStage].shortLabel}).`,
    });
    showToast(
      `Updated ${jobCode} to ${STAGE_METADATA[newStage].shortLabel}.`
    );
  };

  // --- ADMIN / SUPERADMIN CRUD: STAFF & ADMIN ROSTER ---
  const handleCreateBranchStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name.trim() || !newStaffForm.email.trim()) return;
    const branch = activeBranch || branches[0];
    const created: ArtisanStaff = {
      id: `art-${Date.now()}`,
      name: newStaffForm.name.trim(),
      email: newStaffForm.email.trim().toLowerCase(),
      accessTier: newStaffForm.accessTier,
      role: newStaffForm.role,
      branchId: branch.id,
      branchName: branch.name,
      station: newStaffForm.station.trim() || "Main Floor",
      specialty:
        newStaffForm.specialty.trim() ||
        `${ARTISAN_ROLE_LABELS[newStaffForm.role]} Specialist`,
      activeRuns: 1,
      unitsCompletedMonth: 0,
      qcPassRate: 99.2,
      shiftStatus: newStaffForm.shiftStatus,
      status:
        newStaffForm.accessTier === "superadmin"
          ? "Executive HQ"
          : newStaffForm.role === "pattern_designer"
          ? "Pattern Studio"
          : newStaffForm.role === "quality_control"
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
        password: newStaffForm.password.trim() || undefined,
        actor: user.name,
      }),
    })
      .then((r) => r.json())
      .then((resData) => {
        if (resData?.passwordHash) {
          saveLocalPasswordHash(created.email, resData.passwordHash);
        }
      })
      .catch(() => {});

    appendAuditLog({
      action: "rbac.user_created",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: created.email,
      summary: `Added ${created.accessTier.toUpperCase()} (${created.name}) to ${branch.name}.`,
    });
    setCreateStaffModalOpen(false);
    setNewStaffForm({
      name: "",
      email: "",
      password: "",
      accessTier: "staff",
      role: "tailor",
      station: "Sewing Line 1",
      specialty: "Bulk Garment Sewing & Quality Execution",
      shiftStatus: "CLOCKED_IN",
    });
    showToast(
      `Provisioned ${created.accessTier.toUpperCase()} account for ${created.name}!`
    );
  };

  const handleSaveStaffEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    const matchedBranch =
      branches.find((b) => b.id === editingStaff.branchId) || activeBranch;
    const updated: ArtisanStaff = {
      ...editingStaff,
      name: editingStaff.name.trim(),
      email: editingStaff.email.trim().toLowerCase(),
      branchName: matchedBranch ? matchedBranch.name : editingStaff.branchName,
    };
    const next = artisans.map((a) => (a.id === updated.id ? updated : a));
    setArtisans(next);
    saveArtisans(next);
    if (updated.id === user.id) {
      setCurrentSessionUser(updated);
    }

    const nextPassword = editStaffPassword.trim();
    fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...updated,
        password: nextPassword || undefined,
        actor: user.name,
      }),
    })
      .then((r) => r.json())
      .then((resData) => {
        if (resData?.passwordHash) {
          saveLocalPasswordHash(updated.email, resData.passwordHash);
        }
      })
      .catch(() => {});

    appendAuditLog({
      action: "rbac.user_updated",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: updated.email,
      summary: `Updated ${updated.name} (${updated.accessTier.toUpperCase()} · ${ARTISAN_ROLE_LABELS[updated.role]})${nextPassword ? " and rotated login password" : ""}.`,
    });
    setEditStaffPassword("");
    setEditingStaff(null);
    showToast(
      `Updated account for ${updated.name}${nextPassword ? " (password rotated)" : ""}.`
    );
  };

  const handleDeleteBranchStaff = (target: ArtisanStaff) => {
    if (target.id === user.id) {
      showToast("You cannot delete your own active session account.");
      return;
    }
    if (target.accessTier === "superadmin" && !isSuper) {
      showToast("Only Superadmin HQ can remove a Superadmin account.");
      return;
    }
    const next = artisans.filter((a) => a.id !== target.id);
    setArtisans(next);
    saveArtisans(next);

    fetch(
      `/api/admin/users?id=${encodeURIComponent(
        target.id
      )}&email=${encodeURIComponent(target.email)}&actor=${encodeURIComponent(
        user.name
      )}`,
      { method: "DELETE" }
    ).catch(() => {});

    appendAuditLog({
      action: "rbac.user_deleted",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: target.email,
      summary: `Removed ${target.name} (${target.accessTier.toUpperCase()}) from roster.`,
    });
    showToast(`Removed ${target.name} from roster.`);
  };

  // --- ADMIN / SUPERADMIN CRUD: FABRIC & TRIM INVENTORY ---
  const handleCreateSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkuForm.sku.trim() || !newSkuForm.name.trim()) return;
    const created: FabricInventoryItem = {
      id: `fab-${Date.now()}`,
      sku: newSkuForm.sku.trim().toUpperCase(),
      name: newSkuForm.name.trim(),
      category: newSkuForm.category,
      unit: newSkuForm.unit,
      stockLevel: Number(newSkuForm.stockLevel) || 0,
      reorderThreshold: Number(newSkuForm.reorderThreshold) || 200,
      dailyBurnRate: Math.max(1, Number(newSkuForm.dailyBurnRate) || 10),
      costPerUnitNgn: Number(newSkuForm.costPerUnitNgn) || 1000,
      supplierName: newSkuForm.supplierName.trim() || "Lagos Textile Supplier",
      batchLot: newSkuForm.batchLot.trim() || "LOT-2026",
    };
    const next = [created, ...inventory];
    setInventory(next);
    saveInventory(next);
    appendAuditLog({
      action: "inventory.sku_created",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: created.sku,
      summary: `Added material SKU ${created.sku} (${created.name}) with ${created.stockLevel} ${created.unit}.`,
    });
    setCreateSkuModalOpen(false);
    setNewSkuForm({
      sku: "",
      name: "",
      category: "Fabric Roll",
      unit: "meters",
      stockLevel: 500,
      reorderThreshold: 600,
      dailyBurnRate: 45,
      costPerUnitNgn: 4200,
      supplierName: "Lagos Island Textile Mills",
      batchLot: `LOT-LOS-${new Date().getFullYear()}-01`,
    });
    showToast(`Added material SKU ${created.sku} to inventory!`);
  };

  const handleSaveSkuEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSku) return;
    const next = inventory.map((item) =>
      item.id === editingSku.id ? editingSku : item
    );
    setInventory(next);
    saveInventory(next);
    appendAuditLog({
      action: "inventory.sku_updated",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: editingSku.sku,
      summary: `Updated ${editingSku.sku} stock to ${editingSku.stockLevel} ${editingSku.unit} (velocity: ${editingSku.dailyBurnRate}/day).`,
    });
    setEditingSku(null);
    showToast(`Updated material SKU ${editingSku.sku}.`);
  };

  const handleDeleteSku = (skuItem: FabricInventoryItem) => {
    const next = inventory.filter((i) => i.id !== skuItem.id);
    setInventory(next);
    saveInventory(next);
    appendAuditLog({
      action: "inventory.sku_deleted",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: skuItem.sku,
      summary: `Deleted material SKU ${skuItem.sku} (${skuItem.name}).`,
    });
    showToast(`Deleted material SKU ${skuItem.sku}.`);
  };

  const handleQuickRestockSku = (skuItem: FabricInventoryItem, addQty: number) => {
    const next = inventory.map((i) =>
      i.id === skuItem.id ? { ...i, stockLevel: i.stockLevel + addQty } : i
    );
    setInventory(next);
    saveInventory(next);
    showToast(
      `Restocked +${addQty} ${skuItem.unit} on ${skuItem.sku}!`
    );
  };

  // Filter runs assigned to this staff member vs all facility runs
  const myAssignedOrders = orders.filter(
    (o) =>
      o.assignedPatternDesigner.toLowerCase() === user.name.toLowerCase() ||
      o.assignedTailorLead.toLowerCase() === user.name.toLowerCase() ||
      o.assignedQcInspector.toLowerCase() === user.name.toLowerCase()
  );

  const displayedStaffOrders =
    showAllFloorRuns || myAssignedOrders.length === 0
      ? orders
      : myAssignedOrders;

  const branchStaff = artisans.filter(
    (a) => !activeBranch || a.branchId === activeBranch.id
  );
  const lowStockItems = inventory.filter(
    (i) => i.stockLevel / Math.max(1, i.dailyBurnRate) < 14
  );
  const displayedInventory = showLowStockOnly ? lowStockItems : inventory;

  const branchRevenue = orders.reduce((acc, o) => acc + o.totalQuoteNgn, 0);
  const branchGrossProfit = Math.round(branchRevenue * 0.58);

  const patternDesigners = artisans.filter((a) => a.role === "pattern_designer");
  const tailors = artisans.filter((a) => a.role === "tailor");
  const qcInspectors = artisans.filter((a) => a.role === "quality_control");

  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main>
      <div
        className={`dashboard-shell ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        {/* STAFF & ADMIN ROLE-ADAPTIVE SIDEBAR */}
        <aside
          className="dashboard-sidebar"
          aria-label={
            isStaff ? "Staff Station Sidebar" : "Plant Admin Console Sidebar"
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Identity & Facility Card */}
            <div className="sidebar-identity-card">
              <div className="sidebar-identity-top">
                <span className="sidebar-avatar" aria-hidden="true">
                  {userInitials}
                </span>
                <div className="sidebar-identity-meta">
                  <div className="sidebar-user-name">{user.name}</div>
                  <div className="sidebar-user-email">{user.email}</div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  paddingTop: 6,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span className="mkp-badge mkp-badge-olive">
                  {user.accessTier.toUpperCase()} ·{" "}
                  {ARTISAN_ROLE_LABELS[user.role]}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)" }}
                >
                  {user.shiftStatus === "CLOCKED_IN"
                    ? "● Clocked In"
                    : "○ Off Shift"}
                </span>
              </div>
              {!isStaff ? (
                <select
                  aria-label="Active Facility Branch"
                  className="table-select"
                  style={{ width: "100%", marginTop: 4 }}
                  value={activeBranch?.id || ""}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="mono"
                  style={{ fontSize: 10.5, color: "var(--muted)" }}
                >
                  Station: <strong>{user.station}</strong>
                </div>
              )}
            </div>

            {/* Role-Adaptive Navigation Modules */}
            <nav
              aria-label={
                isStaff ? "Staff Station Modules" : "Plant Admin Modules"
              }
            >
              <div className="sidebar-section-label">
                {isStaff ? "STATION WORKBENCH" : "PLANT ADMIN MODULES"}
              </div>
              {isStaff ? (
                <ul className="sidebar-nav-list">
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "overview" ? "active" : ""
                      }`}
                      onClick={() => setActiveSection("overview")}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ◈
                        </span>
                        <span>My Station Console</span>
                      </span>
                      <span className="sidebar-nav-badge">ALL</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "orders" && !showAllFloorRuns
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setActiveSection("orders");
                        setShowAllFloorRuns(false);
                      }}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ⚙
                        </span>
                        <span>My Assigned Work Queue</span>
                      </span>
                      <span className="sidebar-nav-badge">
                        {myAssignedOrders.length}
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "orders" && showAllFloorRuns
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setActiveSection("orders");
                        setShowAllFloorRuns(true);
                      }}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ⊞
                        </span>
                        <span>All Plant Production Runs</span>
                      </span>
                      <span className="sidebar-nav-badge">{orders.length}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "inventory" ? "active" : ""
                      }`}
                      onClick={() => setActiveSection("inventory")}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ▤
                        </span>
                        <span>Fabric &amp; Trim Store</span>
                      </span>
                      <span className="sidebar-nav-badge">
                        {inventory.length}
                      </span>
                    </button>
                  </li>
                </ul>
              ) : (
                <ul className="sidebar-nav-list">
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "overview" ? "active" : ""
                      }`}
                      onClick={() => setActiveSection("overview")}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ◈
                        </span>
                        <span>Plant Overview (All)</span>
                      </span>
                      <span className="sidebar-nav-badge">ALL</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "orders" ? "active" : ""
                      }`}
                      onClick={() => setActiveSection("orders")}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ⊞
                        </span>
                        <span>Production Runs CRUD</span>
                      </span>
                      <span className="sidebar-nav-badge">{orders.length}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "roster" ? "active" : ""
                      }`}
                      onClick={() => setActiveSection("roster")}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ◆
                        </span>
                        <span>Admins &amp; Staff Roster</span>
                      </span>
                      <span className="sidebar-nav-badge">
                        {branchStaff.length}
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        activeSection === "inventory" ? "active" : ""
                      }`}
                      onClick={() => setActiveSection("inventory")}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon" aria-hidden="true">
                          ▤
                        </span>
                        <span>Fabric &amp; Trim SKUs</span>
                      </span>
                      <span className="sidebar-nav-badge">
                        {inventory.length}
                      </span>
                    </button>
                  </li>
                </ul>
              )}
            </nav>

            {/* Quick Actions */}
            <div>
              <div className="sidebar-section-label">
                {isStaff ? "SHIFT & STATION CONTROLS" : "QUICK CRUD ACTIONS"}
              </div>
              <div className="sidebar-action-stack">
                {isStaff ? (
                  <>
                    <button
                      type="button"
                      className="sidebar-quick-btn primary"
                      onClick={handleToggleShift}
                    >
                      <span>
                        {user.shiftStatus === "CLOCKED_IN"
                          ? "● Clock Out of Shift"
                          : "○ Clock In to Station"}
                      </span>
                      <span aria-hidden="true">⏱</span>
                    </button>
                    <button
                      type="button"
                      className="sidebar-quick-btn"
                      onClick={() => setShowAllFloorRuns((v) => !v)}
                    >
                      <span>
                        {showAllFloorRuns
                          ? "Show Only My Queue"
                          : "Show All Plant Runs"}
                      </span>
                      <span aria-hidden="true">⇄</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="sidebar-quick-btn primary"
                      onClick={() => setCreateOrderModalOpen(true)}
                    >
                      <span>+ New Production Run</span>
                      <span aria-hidden="true">⊞</span>
                    </button>
                    <button
                      type="button"
                      className="sidebar-quick-btn"
                      onClick={() => setCreateStaffModalOpen(true)}
                    >
                      <span>+ Add Admin / Staff</span>
                      <span aria-hidden="true">◆</span>
                    </button>
                    <button
                      type="button"
                      className="sidebar-quick-btn"
                      onClick={() => setCreateSkuModalOpen(true)}
                    >
                      <span>+ Add Material SKU</span>
                      <span aria-hidden="true">▤</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cross-Portal Links */}
          <div className="sidebar-footer-card">
            <div className="sidebar-section-label" style={{ marginTop: 0 }}>
              OPERATIONS PORTALS
            </div>
            {isSuper && (
              <Link className="sidebar-quick-btn" href="/superadmin">
                <span>Superadmin Global HQ</span>
                <span aria-hidden="true">★</span>
              </Link>
            )}
            <Link className="sidebar-quick-btn" href="/workspace">
              <span>Full Factory OS</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="sidebar-quick-btn" href="/tracker">
              <span>Live Order Tracker</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="sidebar-quick-btn" href="/login">
              <span>Switch Account</span>
              <span aria-hidden="true">⇄</span>
            </Link>
          </div>
        </aside>

        {/* MAIN DASHBOARD WORKSPACE */}
        <section className="dashboard-main">
          <div className="dashboard-topbar-strip">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
              >
                <span aria-hidden="true">☰</span>
                {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
              </button>
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--muted)" }}
              >
                MODULE: <strong>{activeSection.toUpperCase()}</strong>
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              FACILITY:{" "}
              <strong>
                {activeBranch?.name.toUpperCase() || "YABA FLAGSHIP PLANT"}
              </strong>
            </div>
          </div>

          {/* Role-Adaptive Header */}
          <div className="section-heading" style={{ marginBottom: 24 }}>
          <div>
            <div className="section-kicker">
              {isStaff
                ? `STAFF STATION DASHBOARD · ${ARTISAN_ROLE_LABELS[
                    user.role
                  ].toUpperCase()}`
                : `${ACCESS_TIER_LABELS[user.accessTier].toUpperCase()} CRUD CONSOLE · ${
                    activeBranch?.name.toUpperCase() || "LAGOS FACILITY"
                  }`}
            </div>
            <h2>
              {isStaff ? (
                <>
                  {user.name}’s{" "}
                  <em>{ARTISAN_ROLE_LABELS[user.role]} Console.</em>
                </>
              ) : (
                <>
                  Plant Operations, Admin CRUD &amp;{" "}
                  <em>Branch P&amp;L.</em>
                </>
              )}
            </h2>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!isStaff && (
              <select
                aria-label="Switch Active Facility Branch"
                className="table-select"
                style={{ minHeight: 44 }}
                value={activeBranch?.id || ""}
                onChange={(e) => setActiveBranchId(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Facility: {b.name}
                  </option>
                ))}
              </select>
            )}
            {isSuper && (
              <Link
                className="button button-light"
                href="/superadmin"
                style={{ minHeight: 44, border: "1px solid var(--line)" }}
              >
                Superadmin Global HQ <span>★</span>
              </Link>
            )}
            {isStaff ? (
              <button
                type="button"
                className={`button ${
                  user.shiftStatus === "CLOCKED_IN"
                    ? "button-dark"
                    : "button-light"
                }`}
                style={{ minHeight: 44, border: "1px solid var(--line)" }}
                onClick={handleToggleShift}
              >
                {user.shiftStatus === "CLOCKED_IN"
                  ? "● Shift Clocked In (Click to Clock Out)"
                  : "○ Off Shift (Click to Clock In)"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button button-light"
                  style={{ minHeight: 44, border: "1px solid var(--line)" }}
                  onClick={() => setCreateStaffModalOpen(true)}
                >
                  + Add Admin / Staff
                </button>
                <button
                  type="button"
                  className="button button-dark"
                  style={{ minHeight: 44 }}
                  onClick={() => setCreateOrderModalOpen(true)}
                >
                  + New Production Run
                </button>
                <Link
                  className="button button-light"
                  href="/workspace"
                  style={{ minHeight: 44, border: "1px solid var(--line)" }}
                >
                  Full Factory OS <span>⚙</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mkp-banner mkp-banner-olive"
            style={{ marginBottom: 20 }}
          >
            {notice}
          </div>
        )}

        {/* KPI CARDS: STAFF VS ADMIN/SUPERADMIN */}
        {isStaff ? (
          <div className="kpi-grid-4">
            <div className="kpi-card">
              <span className="ticket-label">MY ASSIGNED PRODUCTION RUNS</span>
              <div className="kpi-value mono">
                {myAssignedOrders.length} Active Runs
              </div>
              <div className="kpi-sub">Station: {user.station}</div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">MY OUTPUT THIS MONTH</span>
              <div className="kpi-value mono" style={{ color: "var(--ink)" }}>
                {user.unitsCompletedMonth.toLocaleString()} pcs
              </div>
              <div className="kpi-sub">
                Role: {ARTISAN_ROLE_LABELS[user.role]}
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">MY FIRST-PASS QC YIELD</span>
              <div className="kpi-value mono">{user.qcPassRate.toFixed(1)}%</div>
              <div className="kpi-sub">AQL 2.5 Standard Target: ≥ 98.0%</div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">ACTIVE SHIFT &amp; FACILITY</span>
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {user.shiftStatus === "CLOCKED_IN" ? "CLOCKED IN" : "OFF SHIFT"}
              </div>
              <div className="kpi-sub">{user.branchName}</div>
            </div>
          </div>
        ) : (
          <div className="kpi-grid-4">
            <div className="kpi-card">
              <span className="ticket-label">BRANCH PIPELINE REVENUE</span>
              <div className="kpi-value mono">
                ₦{branchRevenue.toLocaleString()}
              </div>
              <div className="kpi-sub">
                {orders.length} active B2B garment production runs
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">EST. BRANCH GROSS PROFIT (58%)</span>
              <div className="kpi-value mono" style={{ color: "var(--ink)" }}>
                ₦{branchGrossProfit.toLocaleString()}
              </div>
              <div className="kpi-sub">
                Facility: {activeBranch?.name || "Yaba Flagship"}
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">BRANCH ADMINS &amp; SPECIALISTS</span>
              <div className="kpi-value mono">
                {branchStaff.length} Accounts
              </div>
              <div className="kpi-sub">
                {branchStaff.filter((s) => s.accessTier !== "staff").length}{" "}
                Admins ·{" "}
                {branchStaff.filter((s) => s.accessTier === "staff").length}{" "}
                Specialists
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">LOW-RUNWAY FABRIC ALERTS</span>
              <div className="kpi-value mono">
                {lowStockItems.length} Materials
              </div>
              <div className="kpi-sub">
                SKUs with &lt; 14 days cutting velocity runway
              </div>
            </div>
          </div>
        )}

        {/* STAFF VIEW: ASSIGNED RUNS, STATION BATCH WORKBENCH & FABRIC STORE */}
        {isStaff ? (
          <>
            {(activeSection === "overview" || activeSection === "orders") && (
              <div className="workspace-panel" style={{ marginBottom: 24 }}>
                <div className="panel-header-row">
                  <div>
                    <h3>
                      My Station Work Queue — {ARTISAN_ROLE_LABELS[user.role]} (
                      {displayedStaffOrders.length} Runs)
                    </h3>
                    <p>
                      Log completed pattern grading, cutting lays, sewing line
                      batches, or AQL 2.5 Quality Control inspections directly from
                      your station.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mkp-inline-btn"
                    onClick={() => setShowAllFloorRuns((v) => !v)}
                  >
                    {showAllFloorRuns
                      ? `Show Only My Runs (${myAssignedOrders.length})`
                      : `Show All Plant Runs (${orders.length})`}
                  </button>
                </div>

                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Assigned production runs table"
                  className="table-wrapper"
                >
                  <table
                    className="size-chart responsive-data-table"
                    style={
                      {
                        "--label-1": "Job Code & Brand",
                        "--label-2": "Garment & Volume",
                        "--label-3": "Current Stage",
                        "--label-4": "Assigned Team",
                        "--label-5": "Sewing & QC Progress",
                        "--label-6": "Station Action",
                      } as React.CSSProperties
                    }
                  >
                    <thead>
                      <tr>
                        <th>Job Code &amp; Brand</th>
                        <th>Garment &amp; Volume</th>
                        <th>Current Stage</th>
                        <th>Assigned Team</th>
                        <th>Sewing &amp; QC Progress</th>
                        <th>Station Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStaffOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              textAlign: "center",
                              padding: 20,
                              color: "var(--muted)",
                            }}
                          >
                            No active production runs queued for this station yet.
                          </td>
                        </tr>
                      ) : (
                        displayedStaffOrders.map((ord) => (
                          <tr key={ord.jobCode}>
                            <th>
                              <div className="mono">{ord.jobCode}</div>
                              <div style={{ fontWeight: 600 }}>{ord.company}</div>
                            </th>
                            <td>
                              <div>{ord.garmentCategory}</div>
                              <div className="mono" style={{ fontSize: 11 }}>
                                <strong>
                                  {ord.exactQuantity.toLocaleString()} pcs
                                </strong>{" "}
                                · Due {ord.targetDeliveryDate}
                              </div>
                            </td>
                            <td>
                              <span className="mkp-badge mkp-badge-olive">
                                {STAGE_METADATA[ord.stage].stepNumber}.{" "}
                                {STAGE_METADATA[ord.stage].shortLabel}
                              </span>
                            </td>
                            <td style={{ fontSize: 11 }}>
                              <div>
                                <strong>Pattern:</strong>{" "}
                                {ord.assignedPatternDesigner}
                              </div>
                              <div>
                                <strong>Tailor:</strong> {ord.assignedTailorLead}
                              </div>
                              <div>
                                <strong>QC:</strong> {ord.assignedQcInspector}
                              </div>
                            </td>
                            <td className="mono" style={{ fontSize: 11.5 }}>
                              <div>
                                Sewn: <strong>{ord.unitsSewn}</strong> /{" "}
                                {ord.exactQuantity}
                              </div>
                              <div style={{ color: "var(--ink)" }}>
                                Passed QC: <strong>{ord.unitsPassedQc}</strong>{" "}
                                pcs
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                {user.role === "pattern_designer" && (
                                  <button
                                    type="button"
                                    className="button button-dark"
                                    style={{
                                      minHeight: 36,
                                      padding: "0 12px",
                                      fontSize: 10,
                                    }}
                                    onClick={() =>
                                      handleStaffBatchAction(
                                        ord,
                                        "approve_pattern"
                                      )
                                    }
                                  >
                                    ✓ Approve Pattern &amp; Marker
                                  </button>
                                )}
                                {user.role === "cutting_master" && (
                                  <button
                                    type="button"
                                    className="button button-dark"
                                    style={{
                                      minHeight: 36,
                                      padding: "0 12px",
                                      fontSize: 10,
                                    }}
                                    onClick={() =>
                                      handleStaffBatchAction(ord, "log_cutting")
                                    }
                                  >
                                    + Log Bulk Cut Bundle
                                  </button>
                                )}
                                {user.role === "tailor" && (
                                  <button
                                    type="button"
                                    className="button button-dark"
                                    style={{
                                      minHeight: 36,
                                      padding: "0 12px",
                                      fontSize: 10,
                                    }}
                                    onClick={() =>
                                      handleStaffBatchAction(ord, "log_sewing")
                                    }
                                  >
                                    +50 Pieces Sewn
                                  </button>
                                )}
                                {(user.role === "quality_control" ||
                                  user.role === "production_manager") && (
                                  <button
                                    type="button"
                                    className="button button-dark"
                                    style={{
                                      minHeight: 36,
                                      padding: "0 12px",
                                      fontSize: 10,
                                    }}
                                    onClick={() =>
                                      handleStaffBatchAction(ord, "pass_qc")
                                    }
                                  >
                                    ✓ Pass +50 QC Units
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="mkp-inline-btn"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setTicketOpen(true);
                                  }}
                                >
                                  Job Ticket 🖨
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(activeSection === "overview" || activeSection === "inventory") && (
              <div className="workspace-panel">
                <div className="panel-header-row">
                  <div>
                    <h3>
                      Fabric &amp; Trim Store Lookup ({displayedInventory.length})
                    </h3>
                    <p>
                      Inspect material batch lots, stock levels, and cutting
                      runway for active runs.
                    </p>
                  </div>
                </div>
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Staff fabric store lookup table"
                  className="table-wrapper"
                >
                  <table
                    className="size-chart responsive-data-table"
                    style={
                      {
                        "--label-1": "Material & Batch",
                        "--label-2": "Category",
                        "--label-3": "Stock & Runway",
                      } as React.CSSProperties
                    }
                  >
                    <thead>
                      <tr>
                        <th>Material &amp; Batch</th>
                        <th>Category</th>
                        <th>Stock &amp; Runway</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInventory.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              textAlign: "center",
                              padding: 20,
                              color: "var(--muted)",
                            }}
                          >
                            No fabric or trim SKUs registered in inventory yet.
                          </td>
                        </tr>
                      ) : (
                        displayedInventory.map((item) => {
                          const days =
                            item.stockLevel / Math.max(1, item.dailyBurnRate);
                          return (
                            <tr key={item.id}>
                              <th>
                                <div>{item.name}</div>
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 400,
                                    color: "var(--muted)",
                                  }}
                                >
                                  {item.sku} · Batch: {item.batchLot}
                                </span>
                              </th>
                              <td>{item.category}</td>
                              <td className="mono">
                                <strong>
                                  {item.stockLevel.toLocaleString()} {item.unit}
                                </strong>{" "}
                                ({days.toFixed(1)} days runway)
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ADMIN / PLANT MANAGER VIEW: FULL CRUD FOR ORDERS, ROSTER & INVENTORY */
          <>
            {/* 1. PRODUCTION ORDERS CRUD PANEL */}
            {(activeSection === "overview" || activeSection === "orders") && (
              <div className="workspace-panel" style={{ marginBottom: 24 }}>
                <div className="panel-header-row">
                  <div>
                    <h3>
                      Production Runs CRUD — {activeBranch?.name || "Lagos Plant"} (
                      {orders.length} Runs)
                    </h3>
                    <p>
                      Create new B2B production orders, advance stages, edit
                      specifications &amp; pricing, or delete cancelled runs.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-dark"
                    style={{ minHeight: 40 }}
                    onClick={() => setCreateOrderModalOpen(true)}
                  >
                    + Create Production Order
                  </button>
                </div>

                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Branch production orders CRUD table"
                  className="table-wrapper"
                >
                  <table
                    className="size-chart responsive-data-table"
                    style={
                      {
                        "--label-1": "Job Code & Brand",
                        "--label-2": "Garment & Value",
                        "--label-3": "Stage",
                        "--label-4": "Assigned Leads",
                        "--label-5": "Floor Progress",
                        "--label-6": "CRUD Actions",
                      } as React.CSSProperties
                    }
                  >
                    <thead>
                      <tr>
                        <th>Job Code &amp; Brand</th>
                        <th>Garment &amp; Value</th>
                        <th>Stage</th>
                        <th>Assigned Leads</th>
                        <th>Floor Progress</th>
                        <th>CRUD Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              textAlign: "center",
                              padding: 20,
                              color: "var(--muted)",
                            }}
                          >
                            No active production orders yet. Click{" "}
                            <strong>+ Create Production Order</strong> to start a
                            new B2B run.
                          </td>
                        </tr>
                      ) : (
                        orders.map((ord) => (
                          <tr key={ord.jobCode}>
                            <th>
                              <div className="mono">{ord.jobCode}</div>
                              <div style={{ fontWeight: 600 }}>{ord.company}</div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 400,
                                  color: "var(--muted)",
                                }}
                              >
                                Due: {ord.targetDeliveryDate}
                              </div>
                            </th>
                            <td>
                              <div>{ord.garmentCategory}</div>
                              <div className="mono" style={{ fontSize: 11 }}>
                                <strong>
                                  {ord.exactQuantity.toLocaleString()} pcs
                                </strong>{" "}
                                · ₦{ord.totalQuoteNgn.toLocaleString()}
                              </div>
                            </td>
                            <td>
                              <select
                                aria-label={`Stage for ${ord.jobCode}`}
                                className="table-select"
                                value={ord.stage}
                                onChange={(e) =>
                                  handleUpdateOrderStage(
                                    ord.jobCode,
                                    e.target.value as ProductionStage
                                  )
                                }
                              >
                                {Object.entries(STAGE_METADATA).map(
                                  ([stKey, meta]) => (
                                    <option key={stKey} value={stKey}>
                                      {meta.stepNumber}. {meta.shortLabel}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>
                            <td style={{ fontSize: 11 }}>
                              <div>
                                <strong>Pattern:</strong>{" "}
                                {ord.assignedPatternDesigner}
                              </div>
                              <div>
                                <strong>Tailor:</strong> {ord.assignedTailorLead}
                              </div>
                              <div>
                                <strong>QC:</strong> {ord.assignedQcInspector}
                              </div>
                            </td>
                            <td className="mono" style={{ fontSize: 11 }}>
                              <div>
                                Sewn: <strong>{ord.unitsSewn}</strong> /{" "}
                                {ord.exactQuantity}
                              </div>
                              <div style={{ color: "var(--ink)" }}>
                                QC Passed: <strong>{ord.unitsPassedQc}</strong>{" "}
                                pcs
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  type="button"
                                  className="mkp-inline-btn"
                                  onClick={() => setEditingOrder(ord)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="mkp-inline-btn"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setTicketOpen(true);
                                  }}
                                >
                                  Ticket 🖨
                                </button>
                                <button
                                  type="button"
                                  className="mkp-inline-btn"
                                  style={{ color: "#9e2a2b" }}
                                  onClick={() => handleDeleteOrder(ord)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. ADMIN/STAFF ROSTER CRUD + INVENTORY CRUD */}
            <div
              className={
                activeSection === "overview" ? "dashboard-split-grid" : ""
              }
            >
              {(activeSection === "overview" || activeSection === "roster") && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div>
                      <h3>
                        Branch Admins &amp; Specialists CRUD ({branchStaff.length})
                      </h3>
                      <p>
                        Create, edit, or remove Plant Admins, Pattern Designers,
                        Tailors &amp; QC Inspectors.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button-dark"
                      style={{ minHeight: 38 }}
                      onClick={() => setCreateStaffModalOpen(true)}
                    >
                      + Add Admin / Staff
                    </button>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Facility artisan and admin CRUD table"
                    className="table-wrapper"
                  >
                    <table
                      className="size-chart responsive-data-table"
                      style={
                        {
                          "--label-1": "Specialist / Admin",
                          "--label-2": "Tier & Role",
                          "--label-3": "Output & QC",
                          "--label-4": "Actions",
                        } as React.CSSProperties
                      }
                    >
                      <thead>
                        <tr>
                          <th>Specialist / Admin</th>
                          <th>Tier &amp; Role</th>
                          <th>Output &amp; QC</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchStaff.map((sp) => (
                          <tr key={sp.id}>
                            <th>
                              <div>{sp.name}</div>
                              <div
                                className="mono"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 400,
                                  color: "var(--muted)",
                                }}
                              >
                                {sp.email}
                              </div>
                            </th>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 4,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span className="size-pill-item">
                                  {sp.accessTier.toUpperCase()}
                                </span>
                                <span className="mkp-badge mkp-badge-olive">
                                  {ARTISAN_ROLE_LABELS[sp.role]}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: "var(--muted)",
                                  marginTop: 3,
                                }}
                              >
                                {sp.station} ·{" "}
                                {sp.shiftStatus === "CLOCKED_IN"
                                  ? "● Clocked In"
                                  : "○ Off Shift"}
                              </div>
                            </td>
                            <td className="mono">
                              <div>
                                <strong>
                                  {sp.unitsCompletedMonth.toLocaleString()} pcs
                                </strong>
                              </div>
                              <div
                                style={{ fontSize: 10.5, color: "var(--ink)" }}
                              >
                                {sp.qcPassRate.toFixed(1)}% QC
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  type="button"
                                  className="mkp-inline-btn"
                                  onClick={() => setEditingStaff(sp)}
                                >
                                  Edit
                                </button>
                                {sp.id !== user.id && (
                                  <button
                                    type="button"
                                    className="mkp-inline-btn"
                                    style={{ color: "#9e2a2b" }}
                                    onClick={() => handleDeleteBranchStaff(sp)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(activeSection === "overview" ||
                activeSection === "inventory") && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div>
                      <h3>
                        Fabric &amp; Trim Inventory CRUD (
                        {displayedInventory.length})
                      </h3>
                      <p>
                        Manage material SKUs, stock levels, and cutting velocity
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="mkp-inline-btn"
                        onClick={() => setShowLowStockOnly((v) => !v)}
                      >
                        {showLowStockOnly
                          ? `Show All (${inventory.length})`
                          : `Low Stock (${lowStockItems.length})`}
                      </button>
                      {isManager && (
                        <button
                          type="button"
                          className="button button-dark"
                          style={{ minHeight: 36 }}
                          onClick={() => setCreateSkuModalOpen(true)}
                        >
                          + Add SKU
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Fabric and trim inventory CRUD table"
                    className="table-wrapper"
                  >
                    <table
                      className="size-chart responsive-data-table"
                      style={
                        {
                          "--label-1": "Material",
                          "--label-2": "Stock & Runway",
                          "--label-3": "Actions",
                        } as React.CSSProperties
                      }
                    >
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Stock &amp; Runway</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedInventory.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              style={{
                                textAlign: "center",
                                padding: 20,
                                color: "var(--muted)",
                              }}
                            >
                              No fabric or trim SKUs added yet. Click{" "}
                              <strong>+ Add SKU</strong> to register materials.
                            </td>
                          </tr>
                        ) : (
                          displayedInventory.map((item) => {
                            const days =
                              item.stockLevel /
                              Math.max(1, item.dailyBurnRate);
                            return (
                              <tr key={item.id}>
                                <th>
                                  <div>{item.name}</div>
                                  <span
                                    className="mono"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 400,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {item.sku} · {item.supplierName}
                                  </span>
                                </th>
                                <td className="mono">
                                  <div>
                                    <strong>
                                      {item.stockLevel.toLocaleString()}{" "}
                                      {item.unit}
                                    </strong>
                                  </div>
                                  <span
                                    className={`mkp-badge ${
                                      days < 7
                                        ? "mkp-badge-critical"
                                        : days < 14
                                        ? "mkp-badge-warn"
                                        : "mkp-badge-olive"
                                    }`}
                                  >
                                    {days.toFixed(1)} days left
                                  </span>
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="mkp-inline-btn"
                                      onClick={() =>
                                        handleQuickRestockSku(item, 100)
                                      }
                                    >
                                      +100
                                    </button>
                                    <button
                                      type="button"
                                      className="mkp-inline-btn"
                                      onClick={() => setEditingSku(item)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="mkp-inline-btn"
                                      style={{ color: "#9e2a2b" }}
                                      onClick={() => handleDeleteSku(item)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        </section>
      </div>

      <ProductionJobTicketModal
        order={selectedOrder}
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
      />

      {/* CREATE PRODUCTION ORDER MODAL */}
      <ModalDialog
        open={createOrderModalOpen}
        onClose={() => setCreateOrderModalOpen(false)}
        title="Create New B2B Production Run"
        maxWidth={560}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleCreateOrder}
        >
          <div className="form-row">
            <label>
              Fashion Brand / Client *
              <input
                name="company"
                required
                placeholder="e.g. Zora Lagos Atelier"
                value={newOrderForm.company}
                onChange={(e) =>
                  setNewOrderForm((p) => ({ ...p, company: e.target.value }))
                }
              />
            </label>
            <label>
              Client Email *
              <input
                name="email"
                type="email"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="production@brand.com"
                value={newOrderForm.email}
                onChange={(e) =>
                  setNewOrderForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Garment Category *
              <select
                name="garmentCategory"
                value={newOrderForm.garmentCategory}
                onChange={(e) =>
                  setNewOrderForm((p) => ({
                    ...p,
                    garmentCategory: e.target.value,
                  }))
                }
              >
                <option value="Tops / shirts">Tops / shirts</option>
                <option value="Dresses / jumpsuits">Dresses / jumpsuits</option>
                <option value="Trousers / skirts / shorts">
                  Trousers / skirts / shorts
                </option>
                <option value="Outerwear / jackets">Outerwear / jackets</option>
                <option value="Two-piece sets">Two-piece sets</option>
                <option value="Uniforms / workwear">Uniforms / workwear</option>
              </select>
            </label>
            <label>
              Exact Run Quantity (Pieces) *
              <input
                name="exactQuantity"
                type="number"
                min={20}
                required
                value={newOrderForm.exactQuantity}
                onChange={(e) =>
                  setNewOrderForm((p) => ({
                    ...p,
                    exactQuantity: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Phone Number
              <input
                name="phone"
                type="tel"
                placeholder="+234 803 000 0000"
                value={newOrderForm.phone}
                onChange={(e) =>
                  setNewOrderForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </label>
            <label>
              Target Delivery Date *
              <input
                name="targetDeliveryDate"
                type="date"
                required
                value={newOrderForm.targetDeliveryDate}
                onChange={(e) =>
                  setNewOrderForm((p) => ({
                    ...p,
                    targetDeliveryDate: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Technical &amp; Finishing Notes
            <textarea
              name="details"
              rows={3}
              value={newOrderForm.details}
              onChange={(e) =>
                setNewOrderForm((p) => ({ ...p, details: e.target.value }))
              }
            />
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="submit"
              className="button button-dark"
              style={{ flex: 1 }}
            >
              Create Production Order
            </button>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => setCreateOrderModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT PRODUCTION ORDER MODAL */}
      <ModalDialog
        open={Boolean(editingOrder)}
        onClose={() => setEditingOrder(null)}
        title={`Edit Production Order — ${editingOrder?.jobCode || ""}`}
        maxWidth={580}
      >
        {editingOrder && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none", border: "none" }}
            onSubmit={handleSaveOrderEdit}
          >
            <div className="form-row">
              <label>
                Fashion Brand / Client *
                <input
                  name="company"
                  required
                  value={editingOrder.company}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      company: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Stage *
                <select
                  name="stage"
                  value={editingOrder.stage}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      stage: e.target.value as ProductionStage,
                    })
                  }
                >
                  {Object.entries(STAGE_METADATA).map(([stKey, meta]) => (
                    <option key={stKey} value={stKey}>
                      {meta.stepNumber}. {meta.shortLabel}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Exact Quantity (Pieces) *
                <input
                  name="exactQuantity"
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
              <label>
                Unit Rate (NGN ₦) *
                <input
                  name="estimatedUnitCostNgn"
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
            </div>
            <div className="form-row">
              <label>
                Units Sewn
                <input
                  name="unitsSewn"
                  type="number"
                  min={0}
                  value={editingOrder.unitsSewn}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      unitsSewn: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Units Passed QC
                <input
                  name="unitsPassedQc"
                  type="number"
                  min={0}
                  value={editingOrder.unitsPassedQc}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      unitsPassedQc: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Pattern Designer
                <select
                  name="assignedPatternDesigner"
                  value={editingOrder.assignedPatternDesigner}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      assignedPatternDesigner: e.target.value,
                    })
                  }
                >
                  {patternDesigners.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Master Tailor Lead
                <select
                  name="assignedTailorLead"
                  value={editingOrder.assignedTailorLead}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      assignedTailorLead: e.target.value,
                    })
                  }
                >
                  {tailors.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                QC Inspector
                <select
                  name="assignedQcInspector"
                  value={editingOrder.assignedQcInspector}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      assignedQcInspector: e.target.value,
                    })
                  }
                >
                  {qcInspectors.map((q) => (
                    <option key={q.id} value={q.name}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Target Delivery Date
                <input
                  name="targetDeliveryDate"
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
            <label>
              Technical Brief &amp; Finishing Notes
              <textarea
                name="details"
                rows={2}
                value={editingOrder.details}
                onChange={(e) =>
                  setEditingOrder({ ...editingOrder, details: e.target.value })
                }
              />
            </label>
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

      {/* CREATE ADMIN / SPECIALIST MODAL */}
      <ModalDialog
        open={createStaffModalOpen}
        onClose={() => setCreateStaffModalOpen(false)}
        title={`Add Admin or Specialist — ${activeBranch?.name || "Lagos Plant"}`}
        maxWidth={540}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleCreateBranchStaff}
        >
          <div className="form-row">
            <label>
              Access Tier (RBAC) *
              <select
                name="accessTier"
                value={newStaffForm.accessTier}
                onChange={(e) =>
                  setNewStaffForm((p) => ({
                    ...p,
                    accessTier: e.target.value as UserAccessTier,
                  }))
                }
              >
                <option value="admin">Admin (Factory Plant Manager)</option>
                <option value="staff">Staff (Artisan / Specialist)</option>
                {isSuper && (
                  <option value="superadmin">Superadmin (Global HQ)</option>
                )}
              </select>
            </label>
            <label>
              Specialist Role *
              <select
                name="role"
                value={newStaffForm.role}
                onChange={(e) =>
                  setNewStaffForm((p) => ({
                    ...p,
                    role: e.target.value as ArtisanRole,
                  }))
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
          <label>
            Full Name *
            <input
              name="name"
              required
              placeholder="e.g. Kudi Lasisi"
              value={newStaffForm.name}
              onChange={(e) =>
                setNewStaffForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </label>
          <div className="form-row">
            <label>
              Work Email *
              <input
                name="email"
                type="email"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="specialist@misskudi.com"
                value={newStaffForm.email}
                onChange={(e) =>
                  setNewStaffForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </label>
            <label>
              Station / Line *
              <input
                name="station"
                required
                placeholder="e.g. Planning Office 1 or Sewing Line 2"
                value={newStaffForm.station}
                onChange={(e) =>
                  setNewStaffForm((p) => ({ ...p, station: e.target.value }))
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
                8+ characters (optional — staff can also use OTP Reset Password)
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Set initial sign-in password"
                value={newStaffForm.password}
                onChange={(e) =>
                  setNewStaffForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </label>
            <label>
              Technical Specialty
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 400,
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                Assigned machinery, QA scope, or CAD focus
              </span>
              <input
                name="specialty"
                value={newStaffForm.specialty}
                onChange={(e) =>
                  setNewStaffForm((p) => ({ ...p, specialty: e.target.value }))
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
              Add Account to Roster
            </button>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => setCreateStaffModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT ADMIN / SPECIALIST MODAL */}
      <ModalDialog
        open={Boolean(editingStaff)}
        onClose={() => {
          setEditStaffPassword("");
          setEditingStaff(null);
        }}
        title={`Edit Account — ${editingStaff?.name || ""}`}
        maxWidth={540}
      >
        {editingStaff && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none", border: "none" }}
            onSubmit={handleSaveStaffEdit}
          >
            <div className="form-row">
              <label>
                Access Tier (RBAC) *
                <select
                  name="accessTier"
                  value={editingStaff.accessTier}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      accessTier: e.target.value as UserAccessTier,
                    })
                  }
                >
                  <option value="admin">Admin (Factory Plant Manager)</option>
                  <option value="staff">Staff (Artisan / Specialist)</option>
                  {isSuper && (
                    <option value="superadmin">Superadmin (Global HQ)</option>
                  )}
                </select>
              </label>
              <label>
                Specialist Role *
                <select
                  name="role"
                  value={editingStaff.role}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
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
                  name="name"
                  required
                  value={editingStaff.name}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, name: e.target.value })
                  }
                />
              </label>
              <label>
                Work Email *
                <input
                  name="email"
                  type="email"
                  required
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={editingStaff.email}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, email: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Station / Office *
                <input
                  name="station"
                  required
                  value={editingStaff.station}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      station: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Shift Status
                <select
                  name="shiftStatus"
                  value={editingStaff.shiftStatus}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      shiftStatus: e.target
                        .value as ArtisanStaff["shiftStatus"],
                    })
                  }
                >
                  <option value="CLOCKED_IN">CLOCKED IN</option>
                  <option value="OFF_SHIFT">OFF SHIFT</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Monthly Output (Pieces)
                <input
                  name="unitsCompletedMonth"
                  type="number"
                  min={0}
                  value={editingStaff.unitsCompletedMonth}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      unitsCompletedMonth: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                QC Pass Rate (%)
                <input
                  name="qcPassRate"
                  type="number"
                  step="0.1"
                  min={50}
                  max={100}
                  value={editingStaff.qcPassRate}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
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
                Minimum 8 characters — clears any failed-login lockout, or{" "}
                <Link
                  href={`/reset-password?email=${encodeURIComponent(
                    editingStaff.email
                  )}`}
                  style={{ textDecoration: "underline", color: "var(--ink)" }}
                >
                  open OTP recovery
                </Link>
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Leave blank to keep existing password"
                value={editStaffPassword}
                onChange={(e) => setEditStaffPassword(e.target.value)}
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
                  setEditStaffPassword("");
                  setEditingStaff(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* CREATE MATERIAL SKU MODAL */}
      <ModalDialog
        open={createSkuModalOpen}
        onClose={() => setCreateSkuModalOpen(false)}
        title="Add New Fabric or Trim SKU"
        maxWidth={540}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleCreateSku}
        >
          <div className="form-row">
            <label>
              SKU Code *
              <input
                name="sku"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="e.g. FAB-SLK-120-IVR"
                value={newSkuForm.sku}
                onChange={(e) =>
                  setNewSkuForm((p) => ({ ...p, sku: e.target.value }))
                }
              />
            </label>
            <label>
              Category *
              <select
                name="category"
                value={newSkuForm.category}
                onChange={(e) =>
                  setNewSkuForm((p) => ({
                    ...p,
                    category: e.target.value as FabricInventoryItem["category"],
                  }))
                }
              >
                <option value="Fabric Roll">Fabric Roll</option>
                <option value="Trim & Hardware">Trim &amp; Hardware</option>
                <option value="Labels & Packaging">
                  Labels &amp; Packaging
                </option>
              </select>
            </label>
          </div>
          <label>
            Material Description *
            <input
              name="name"
              required
              placeholder="e.g. 120 GSM Mulberry Silk Crepe (Ivory)"
              value={newSkuForm.name}
              onChange={(e) =>
                setNewSkuForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </label>
          <div className="form-row">
            <label>
              Initial Stock *
              <input
                name="stockLevel"
                type="number"
                min={0}
                required
                value={newSkuForm.stockLevel}
                onChange={(e) =>
                  setNewSkuForm((p) => ({
                    ...p,
                    stockLevel: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Unit
              <select
                name="unit"
                value={newSkuForm.unit}
                onChange={(e) =>
                  setNewSkuForm((p) => ({
                    ...p,
                    unit: e.target.value as FabricInventoryItem["unit"],
                  }))
                }
              >
                <option value="meters">meters</option>
                <option value="yards">yards</option>
                <option value="pieces">pieces</option>
                <option value="cones">cones</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Daily Burn Rate (Units/Day)
              <input
                name="dailyBurnRate"
                type="number"
                min={1}
                value={newSkuForm.dailyBurnRate}
                onChange={(e) =>
                  setNewSkuForm((p) => ({
                    ...p,
                    dailyBurnRate: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Unit Cost (NGN ₦)
              <input
                name="costPerUnitNgn"
                type="number"
                min={10}
                value={newSkuForm.costPerUnitNgn}
                onChange={(e) =>
                  setNewSkuForm((p) => ({
                    ...p,
                    costPerUnitNgn: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
          <label>
            Preferred Supplier Name *
            <input
              name="supplierName"
              required
              value={newSkuForm.supplierName}
              onChange={(e) =>
                setNewSkuForm((p) => ({ ...p, supplierName: e.target.value }))
              }
            />
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="submit"
              className="button button-dark"
              style={{ flex: 1 }}
            >
              Add Material SKU
            </button>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => setCreateSkuModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT MATERIAL SKU MODAL */}
      <ModalDialog
        open={Boolean(editingSku)}
        onClose={() => setEditingSku(null)}
        title={`Edit Material SKU — ${editingSku?.sku || ""}`}
        maxWidth={540}
      >
        {editingSku && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none", border: "none" }}
            onSubmit={handleSaveSkuEdit}
          >
            <label>
              Material Description *
              <input
                name="name"
                required
                value={editingSku.name}
                onChange={(e) =>
                  setEditingSku({ ...editingSku, name: e.target.value })
                }
              />
            </label>
            <div className="form-row">
              <label>
                Current Stock ({editingSku.unit}) *
                <input
                  name="stockLevel"
                  type="number"
                  min={0}
                  required
                  value={editingSku.stockLevel}
                  onChange={(e) =>
                    setEditingSku({
                      ...editingSku,
                      stockLevel: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Daily Burn Velocity ({editingSku.unit}/day) *
                <input
                  name="dailyBurnRate"
                  type="number"
                  min={1}
                  required
                  value={editingSku.dailyBurnRate}
                  onChange={(e) =>
                    setEditingSku({
                      ...editingSku,
                      dailyBurnRate: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Reorder Threshold
                <input
                  name="reorderThreshold"
                  type="number"
                  min={0}
                  value={editingSku.reorderThreshold}
                  onChange={(e) =>
                    setEditingSku({
                      ...editingSku,
                      reorderThreshold: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Cost per {editingSku.unit} (NGN ₦)
                <input
                  name="costPerUnitNgn"
                  type="number"
                  min={1}
                  value={editingSku.costPerUnitNgn}
                  onChange={(e) =>
                    setEditingSku({
                      ...editingSku,
                      costPerUnitNgn: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              Preferred Supplier
              <input
                name="supplierName"
                value={editingSku.supplierName}
                onChange={(e) =>
                  setEditingSku({
                    ...editingSku,
                    supplierName: e.target.value,
                  })
                }
              />
            </label>
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
                onClick={() => setEditingSku(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </main>
  );
}
