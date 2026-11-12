"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "../components/UiIcon";
import {
  ACCESS_TIER_LABELS,
  appendAuditLog,
  ARTISAN_ROLE_LABELS,
  ArtisanRole,
  ArtisanStaff,
  buildInvoiceFromOrder,
  calculateProductionEstimate,
  canManageFactory,
  clearCurrentSessionUser,
  ClientInvoice,
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
  loadInvoices,
  loadOrders,
  ProductionOrder,
  ProductionStage,
  saveArtisans,
  saveInventory,
  saveInvoices,
  saveLocalPasswordHash,
  saveOrders,
  setActiveBranchId,
  setCurrentSessionUser,
  STAGE_METADATA,
  SURULERE_BRANCH_ID,
  SURULERE_BRANCH_LOCATION,
  SURULERE_BRANCH_NAME,
  UserAccessTier,
} from "../lib/production-os";
import {
  ModalDialog,
  ProductionJobTicketModal,
} from "../components/ProductionJobTicketModal";
import { ConsoleSidebar } from "../components/ConsoleSidebar";
import { InvoicingLedgerPanel } from "../components/InvoicingLedgerPanel";
import { InvoiceDocumentModal } from "../components/InvoiceReceiptModal";

type DashboardSection =
  | "overview"
  | "orders"
  | "invoicing"
  | "roster"
  | "inventory";

export default function RoleDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ArtisanStaff>(() => getCurrentSessionUser());
  const [branches, setBranches] = useState<FactoryBranch[]>([]);
  const [activeBranchId, setBranchId] = useState<string>(() =>
    getActiveBranchId()
  );
  const [artisans, setArtisans] = useState<ArtisanStaff[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [inventory, setInventory] = useState<FabricInventoryItem[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [showAllFloorRuns, setShowAllFloorRuns] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null
  );
  const [ticketOpen, setTicketOpen] = useState(false);
  const [quickInvoiceDoc, setQuickInvoiceDoc] = useState<ClientInvoice | null>(
    null
  );
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // Modals — Production Orders
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(
    null
  );

  // Modals — Team Roster
  const [createStaffModalOpen, setCreateStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ArtisanStaff | null>(null);

  // Modals — Materials & Stock
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
    accessTier: "staff" as UserAccessTier,
    role: "tailor" as ArtisanRole,
    station: "Sewing Line 1",
    specialty: "Bulk Garment Sewing & Quality Execution",
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
    setInvoices(loadInvoices());
  };

  useEffect(() => {
    syncDashboard();
    window.addEventListener("mkp:session-change", syncDashboard);
    window.addEventListener("mkp:branch-change", syncDashboard);
    window.addEventListener("mkp:billing-change", syncDashboard);
    return () => {
      window.removeEventListener("mkp:session-change", syncDashboard);
      window.removeEventListener("mkp:branch-change", syncDashboard);
      window.removeEventListener("mkp:billing-change", syncDashboard);
    };
  }, []);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 1080) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const handleOpenOrCreateOrderInvoice = (ord: ProductionOrder) => {
    const currentInvoices = loadInvoices();
    const existing = currentInvoices.find((inv) => inv.jobCode === ord.jobCode);
    if (existing) {
      setQuickInvoiceDoc(existing);
      return;
    }
    const created = buildInvoiceFromOrder(ord);
    const next = [created, ...currentInvoices];
    setInvoices(next);
    saveInvoices(next);
    appendAuditLog({
      action: "finance.invoice_issued",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: created.invoiceNumber,
      summary: `Generated commercial invoice ${created.invoiceNumber} from order ${ord.jobCode} (${ord.company}).`,
    });
    setQuickInvoiceDoc(created);
    showToast(
      `Generated commercial invoice ${created.invoiceNumber} for ${ord.company}.`
    );
  };

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 5000);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear local session regardless
    } finally {
      clearCurrentSessionUser();
      setSigningOut(false);
      router.push("/login?signedOut=1");
      router.refresh();
    }
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
      role: `Staff, ${ARTISAN_ROLE_LABELS[user.role]}`,
      targetRef: user.station,
      summary: `${user.name} (${ARTISAN_ROLE_LABELS[user.role]}) ${
        nextShift === "CLOCKED_IN" ? "clocked in to" : "clocked out from"
      } ${user.station}.`,
    });
    showToast(
      `Shift status updated: ${
        nextShift === "CLOCKED_IN"
          ? "Clocked In (Active on Station)"
          : "Off Shift"
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
      role: `Staff, ${ARTISAN_ROLE_LABELS[user.role]}`,
      targetRef: order.jobCode,
      summary: `${user.name} (${ARTISAN_ROLE_LABELS[user.role]}) executed ${actionType.replace(
        "_",
        " "
      )} on ${order.company} (${order.jobCode}).`,
    });

    showToast(
      `Recorded ${actionType.replace("_", " ")} on ${order.jobCode} (${
        order.company
      }).`
    );
  };

  // --- PRODUCTION ORDERS ---
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
      branchId: activeBranch?.id || SURULERE_BRANCH_ID,
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
      summary: `Created production order ${created.jobCode} for ${created.company} (${created.exactQuantity} pcs, ₦${created.totalQuoteNgn.toLocaleString()}).`,
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
    showToast(`Created order ${created.jobCode} (${created.company}).`);
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
    showToast(`Removed order ${order.jobCode}.`);
  };

  const handleUpdateOrderStage = (
    jobCode: string,
    newStage: ProductionStage
  ) => {
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
    showToast(`Updated ${jobCode} to ${STAGE_METADATA[newStage].shortLabel}.`);
  };

  // --- TEAM ROSTER ---
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
      action: "team.user_created",
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
    showToast(`Added ${created.name} to ${branch.name}.`);
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
      action: "team.user_updated",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: updated.email,
      summary: `Updated ${updated.name} (${updated.accessTier.toUpperCase()}, ${ARTISAN_ROLE_LABELS[updated.role]})${nextPassword ? " and rotated login password" : ""}.`,
    });
    setEditStaffPassword("");
    setEditingStaff(null);
    showToast(
      `Updated ${updated.name}${nextPassword ? " (password rotated)" : ""}.`
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
      action: "team.user_deleted",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: target.email,
      summary: `Removed ${target.name} (${target.accessTier.toUpperCase()}) from roster.`,
    });
    showToast(`Removed ${target.name} from team roster.`);
  };

  // --- MATERIALS & INVENTORY ---
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
      summary: `Added material ${created.sku} (${created.name}) with ${created.stockLevel} ${created.unit}.`,
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
    showToast(`Added material ${created.sku} to stock.`);
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
    showToast(`Updated material ${editingSku.sku}.`);
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
      summary: `Deleted material ${skuItem.sku} (${skuItem.name}).`,
    });
    showToast(`Removed material ${skuItem.sku}.`);
  };

  const handleQuickRestockSku = (
    skuItem: FabricInventoryItem,
    addQty: number
  ) => {
    const next = inventory.map((i) =>
      i.id === skuItem.id ? { ...i, stockLevel: i.stockLevel + addQty } : i
    );
    setInventory(next);
    saveInventory(next);
    showToast(`Restocked +${addQty} ${skuItem.unit} on ${skuItem.sku}.`);
  };

  // Filtered datasets
  const myAssignedOrders = orders.filter(
    (o) =>
      o.assignedPatternDesigner.toLowerCase() === user.name.toLowerCase() ||
      o.assignedTailorLead.toLowerCase() === user.name.toLowerCase() ||
      o.assignedQcInspector.toLowerCase() === user.name.toLowerCase()
  );

  const displayedStaffOrders = (
    showAllFloorRuns || myAssignedOrders.length === 0
      ? orders
      : myAssignedOrders
  ).filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      o.jobCode.toLowerCase().includes(q) ||
      o.company.toLowerCase().includes(q) ||
      o.garmentCategory.toLowerCase().includes(q)
    );
  });

  const filteredAdminOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      o.jobCode.toLowerCase().includes(q) ||
      o.company.toLowerCase().includes(q) ||
      o.garmentCategory.toLowerCase().includes(q)
    );
  });

  const branchStaff = artisans.filter(
    (a) => !activeBranch || a.branchId === activeBranch.id
  );
  const filteredBranchStaff = branchStaff.filter((s) => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.station.toLowerCase().includes(q)
    );
  });

  const lowStockItems = inventory.filter(
    (i) => i.stockLevel / Math.max(1, i.dailyBurnRate) < 14
  );
  const displayedInventory = (
    showLowStockOnly ? lowStockItems : inventory
  ).filter((item) => {
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.supplierName.toLowerCase().includes(q)
    );
  });

  const branchRevenue = orders.reduce((acc, o) => acc + o.totalQuoteNgn, 0);
  const branchGrossProfit = Math.round(branchRevenue * 0.58);
  const clockedInCount = branchStaff.filter(
    (s) => s.shiftStatus === "CLOCKED_IN"
  ).length;

  const patternDesigners = artisans.filter((a) => a.role === "pattern_designer");
  const tailors = artisans.filter((a) => a.role === "tailor");
  const qcInspectors = artisans.filter((a) => a.role === "quality_control");

  const sectionHeadingMeta: Record<
    DashboardSection,
    { title: string; subtitle: string }
  > = isStaff
    ? {
        overview: {
          title: `${user.name.split(" ")[0]}’s Station`,
          subtitle: `${ARTISAN_ROLE_LABELS[user.role]}, ${user.station}, ${user.branchName}`,
        },
        orders: {
          title: showAllFloorRuns ? "All Plant Orders" : "My Work Queue",
          subtitle: `${displayedStaffOrders.length} active production runs at ${user.branchName}`,
        },
        invoicing: {
          title: "Client Billing",
          subtitle: "Invoices and official receipts are managed by Plant Accounts",
        },
        roster: {
          title: "Plant Team",
          subtitle: `${branchStaff.length} team members at ${user.branchName}`,
        },
        inventory: {
          title: "Materials Lookup",
          subtitle: `${inventory.length} fabric rolls, trims, and packaging SKUs`,
        },
      }
    : {
        overview: {
          title: "Plant Overview",
          subtitle: `${activeBranch?.name || SURULERE_BRANCH_NAME}, ${activeBranch?.location || SURULERE_BRANCH_LOCATION}`,
        },
        orders: {
          title: "Production Orders",
          subtitle: `Manage client runs, floor stages, and job tickets for ${activeBranch?.name || "this plant"}`,
        },
        invoicing: {
          title: "Invoicing & Official Receipts",
          subtitle: `Client commercial invoices, deposits, and official payment receipts for ${activeBranch?.name || "this plant"}`,
        },
        roster: {
          title: "Team Roster",
          subtitle: `Plant managers, pattern designers, tailors, and QC leads at ${activeBranch?.name || "this plant"}`,
        },
        inventory: {
          title: "Materials & Stock",
          subtitle: `Fabric rolls, trims, and 14-day cutting velocity alerts`,
        },
      };

  const renderStaffActionBtn = (ord: ProductionOrder) => {
    if (user.role === "pattern_designer") {
      return (
        <button
          type="button"
          className="button button-dark"
          style={{ minHeight: 34, padding: "0 12px", fontSize: 10.5 }}
          onClick={() => handleStaffBatchAction(ord, "approve_pattern")}
        >
          Approve Pattern
        </button>
      );
    }
    if (user.role === "cutting_master") {
      return (
        <button
          type="button"
          className="button button-dark"
          style={{ minHeight: 34, padding: "0 12px", fontSize: 10.5 }}
          onClick={() => handleStaffBatchAction(ord, "log_cutting")}
        >
          + Log Cut Bundle
        </button>
      );
    }
    if (user.role === "tailor") {
      return (
        <button
          type="button"
          className="button button-dark"
          style={{ minHeight: 34, padding: "0 12px", fontSize: 10.5 }}
          onClick={() => handleStaffBatchAction(ord, "log_sewing")}
        >
          +50 Sewn
        </button>
      );
    }
    return (
      <button
        type="button"
        className="button button-dark"
        style={{ minHeight: 34, padding: "0 12px", fontSize: 10.5 }}
        onClick={() => handleStaffBatchAction(ord, "pass_qc")}
      >
        Pass +50 QC
      </button>
    );
  };

  const sidebarItems = isStaff
    ? [
        {
          id: "overview",
          label: "Station Overview",
          icon: "grid" as const,
          active: activeSection === "overview",
          onSelect: () => setActiveSection("overview"),
        },
        {
          id: "my-queue",
          label: "My Work Queue",
          icon: "layers" as const,
          badge: myAssignedOrders.length,
          active: activeSection === "orders" && !showAllFloorRuns,
          onSelect: () => {
            setActiveSection("orders");
            setShowAllFloorRuns(false);
          },
        },
        {
          id: "all-orders",
          label: "All Plant Orders",
          icon: "compass" as const,
          badge: orders.length,
          active: activeSection === "orders" && showAllFloorRuns,
          onSelect: () => {
            setActiveSection("orders");
            setShowAllFloorRuns(true);
          },
        },
        {
          id: "inventory",
          label: "Materials Lookup",
          icon: "box" as const,
          badge: inventory.length,
          active: activeSection === "inventory",
          onSelect: () => setActiveSection("inventory"),
        },
      ]
    : [
        {
          id: "overview",
          label: "Overview",
          icon: "grid" as const,
          active: activeSection === "overview",
          onSelect: () => setActiveSection("overview"),
        },
        {
          id: "orders",
          label: "Production Orders",
          icon: "layers" as const,
          badge: orders.length,
          active: activeSection === "orders",
          onSelect: () => setActiveSection("orders"),
        },
        {
          id: "invoicing",
          label: "Invoicing & Receipts",
          icon: "receipt" as const,
          badge: invoices.length,
          active: activeSection === "invoicing",
          onSelect: () => setActiveSection("invoicing"),
        },
        {
          id: "roster",
          label: "Team Roster",
          icon: "users" as const,
          badge: branchStaff.length,
          active: activeSection === "roster",
          onSelect: () => setActiveSection("roster"),
        },
        {
          id: "inventory",
          label: "Materials & Stock",
          icon: "box" as const,
          badge: inventory.length,
          active: activeSection === "inventory",
          onSelect: () => setActiveSection("inventory"),
        },
      ];

  return (
    <main>
      <div
        className={`dashboard-shell ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <ConsoleSidebar
          user={user}
          groupLabel={isStaff ? "Station Workspace" : "Plant Console"}
          items={sidebarItems}
          branches={branches}
          activeBranchId={activeBranch?.id}
          onBranchChange={(nextId) => setActiveBranchId(nextId)}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />

        {/* MAIN CALM WORKSPACE */}
        <section className="dashboard-main">
          {/* Single Calm Page Header with Contextual Primary Action */}
          <header className="dashboard-page-header">
            <div className="dashboard-page-header-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label="Toggle studio navigation sidebar"
                aria-expanded={!sidebarCollapsed}
                onClick={handleToggleSidebar}
              >
                <UiIcon name="menu" size={16} />
              </button>
              <div>
                <h1 className="dashboard-page-title">
                  {sectionHeadingMeta[activeSection].title}
                </h1>
                <p className="dashboard-page-subtitle">
                  {sectionHeadingMeta[activeSection].subtitle}
                </p>
              </div>
            </div>

            <div className="dashboard-page-actions">
              {isStaff ? (
                <button
                  type="button"
                  className={`button ${
                    user.shiftStatus === "CLOCKED_IN"
                      ? "button-dark"
                      : "button-light"
                  }`}
                  style={{ minHeight: 40, border: "1px solid var(--line)" }}
                  onClick={handleToggleShift}
                >
                  {user.shiftStatus === "CLOCKED_IN"
                    ? "Clocked in (End shift)"
                    : "Off shift (Clock in)"}
                </button>
              ) : activeSection === "invoicing" ? (
                <button
                  type="button"
                  className="button button-light"
                  style={{ minHeight: 40 }}
                  onClick={() => setActiveSection("orders")}
                >
                  Production Orders ({orders.length})
                </button>
              ) : activeSection === "roster" ? (
                <button
                  type="button"
                  className="button button-dark"
                  style={{ minHeight: 40 }}
                  onClick={() => setCreateStaffModalOpen(true)}
                >
                  + Add Team Member
                </button>
              ) : activeSection === "inventory" ? (
                <button
                  type="button"
                  className="button button-dark"
                  style={{ minHeight: 40 }}
                  onClick={() => setCreateSkuModalOpen(true)}
                >
                  + Add Material
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-dark"
                  style={{ minHeight: 40 }}
                  onClick={() => setCreateOrderModalOpen(true)}
                >
                  + New Order
                </button>
              )}
            </div>
          </header>

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

          {/* ==================== STAFF VIEWS ==================== */}
          {isStaff ? (
            <>
              {activeSection === "overview" && (
                <>
                  <div className="kpi-grid-4">
                    <div className="kpi-card">
                      <span className="ticket-label">Assigned queue</span>
                      <div className="kpi-value mono">
                        {myAssignedOrders.length} Runs
                      </div>
                      <div className="kpi-sub">{user.station}</div>
                    </div>
                    <div className="kpi-card">
                      <span className="ticket-label">Monthly output</span>
                      <div
                        className="kpi-value mono"
                        style={{ color: "var(--ink)" }}
                      >
                        {user.unitsCompletedMonth.toLocaleString()} pcs
                      </div>
                      <div className="kpi-sub">
                        {ARTISAN_ROLE_LABELS[user.role]}
                      </div>
                    </div>
                    <div className="kpi-card">
                      <span className="ticket-label">First-pass QC yield</span>
                      <div className="kpi-value mono">
                        {user.qcPassRate.toFixed(1)}%
                      </div>
                      <div className="kpi-sub">Target ≥ 98.0% (AQL 2.5)</div>
                    </div>
                    <div className="kpi-card">
                      <span className="ticket-label">Shift status</span>
                      <div className="kpi-value" style={{ fontSize: 18 }}>
                        {user.shiftStatus === "CLOCKED_IN"
                          ? "Clocked in"
                          : "Off shift"}
                      </div>
                      <div className="kpi-sub">{user.branchName}</div>
                    </div>
                  </div>

                  {/* Focused Station Queue Card */}
                  <div className="workspace-panel" style={{ marginBottom: 24 }}>
                    <div className="panel-header-row">
                      <div>
                        <h3>Active Station Work Queue</h3>
                        <p>
                          Showing up to 5 priority runs assigned to your
                          station.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="mkp-inline-btn"
                        onClick={() => {
                          setActiveSection("orders");
                          setShowAllFloorRuns(false);
                        }}
                      >
                        Full queue ({displayedStaffOrders.length})
                      </button>
                    </div>

                    {displayedStaffOrders.length === 0 ? (
                      <div className="console-empty-state">
                        <p>No active production runs assigned right now.</p>
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => {
                            setActiveSection("orders");
                            setShowAllFloorRuns(true);
                          }}
                        >
                          Plant orders ({orders.length})
                        </button>
                      </div>
                    ) : (
                      <div className="summary-list">
                        {displayedStaffOrders.slice(0, 5).map((ord) => (
                          <div key={ord.jobCode} className="summary-list-row">
                            <div className="summary-list-primary">
                              <div className="summary-row-title">
                                <span className="mono">{ord.jobCode}</span>
                                <strong>{ord.company}</strong>
                                <span className="mkp-badge mkp-badge-olive">
                                  {STAGE_METADATA[ord.stage].shortLabel}
                                </span>
                              </div>
                              <div className="summary-row-sub">
                                {ord.garmentCategory},{" "}
                                {ord.exactQuantity.toLocaleString()} pcs, Sewn{" "}
                                {ord.unitsSewn}/{ord.exactQuantity}, Due{" "}
                                {ord.targetDeliveryDate}
                              </div>
                            </div>
                            <div className="summary-list-actions">
                              {renderStaffActionBtn(ord)}
                              <button
                                type="button"
                                className="mkp-inline-btn"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setTicketOpen(true);
                                }}
                              >
                                <UiIcon name="print" size={13} /> Ticket
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Compact Material Readiness Card */}
                  <div className="workspace-panel">
                    <div className="panel-header-row">
                      <div>
                        <h3>Materials &amp; Batch Readiness</h3>
                        <p>
                          Quick view of fabric rolls and trims on the cutting
                          floor.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="mkp-inline-btn"
                        onClick={() => setActiveSection("inventory")}
                      >
                        All materials ({inventory.length})
                      </button>
                    </div>
                    {inventory.length === 0 ? (
                      <div className="console-empty-state">
                        <p>No materials registered in plant stock yet.</p>
                      </div>
                    ) : (
                      <div className="summary-list">
                        {inventory.slice(0, 4).map((item) => {
                          const days =
                            item.stockLevel / Math.max(1, item.dailyBurnRate);
                          return (
                            <div key={item.id} className="summary-list-row">
                              <div className="summary-list-primary">
                                <div className="summary-row-title">
                                  <strong>{item.name}</strong>
                                  <span className="mono summary-muted-code">
                                    {item.sku}
                                  </span>
                                </div>
                                <div className="summary-row-sub">
                                  {item.category}, Batch {item.batchLot}
                                </div>
                              </div>
                              <div className="summary-list-actions mono">
                                <span>
                                  {item.stockLevel.toLocaleString()} {item.unit}
                                </span>
                                <span
                                  className={`mkp-badge ${
                                    days < 14
                                      ? "mkp-badge-warn"
                                      : "mkp-badge-olive"
                                  }`}
                                >
                                  {days.toFixed(0)}d runway
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeSection === "orders" && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div className="panel-filter-bar">
                      <input
                        type="search"
                        aria-label="Search orders by job code or client"
                        placeholder="Search job code, brand, garment..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="table-select"
                        style={{ minWidth: 220 }}
                      />
                      <button
                        type="button"
                        className="mkp-inline-btn"
                        onClick={() => setShowAllFloorRuns((v) => !v)}
                      >
                        {showAllFloorRuns
                          ? `My Assigned Only (${myAssignedOrders.length})`
                          : `Show All Plant Orders (${orders.length})`}
                      </button>
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Assigned production orders table"
                    className="table-wrapper"
                  >
                    <table
                      className="size-chart responsive-data-table"
                      style={
                        {
                          "--label-1": "Order & Client",
                          "--label-2": "Garment & Volume",
                          "--label-3": "Stage",
                          "--label-4": "Assigned Leads",
                          "--label-5": "Floor Progress",
                          "--label-6": "Actions",
                        } as React.CSSProperties
                      }
                    >
                      <thead>
                        <tr>
                          <th>Order &amp; Client</th>
                          <th>Garment &amp; Volume</th>
                          <th>Stage</th>
                          <th>Assigned Leads</th>
                          <th>Floor Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedStaffOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                textAlign: "center",
                                padding: 24,
                                color: "var(--muted)",
                              }}
                            >
                              No matching production runs found.
                            </td>
                          </tr>
                        ) : (
                          displayedStaffOrders.map((ord) => (
                            <tr key={ord.jobCode}>
                              <th>
                                <div className="mono">{ord.jobCode}</div>
                                <div style={{ fontWeight: 600 }}>
                                  {ord.company}
                                </div>
                              </th>
                              <td>
                                <div>{ord.garmentCategory}</div>
                                <div className="mono" style={{ fontSize: 11 }}>
                                  <strong>
                                    {ord.exactQuantity.toLocaleString()} pcs
                                  </strong>
                                  , Due {ord.targetDeliveryDate}
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
                                  <strong>Tailor:</strong>{" "}
                                  {ord.assignedTailorLead}
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
                                  QC Passed:{" "}
                                  <strong>{ord.unitsPassedQc}</strong> pcs
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
                                  {renderStaffActionBtn(ord)}
                                  <button
                                    type="button"
                                    className="mkp-inline-btn"
                                    onClick={() => {
                                      setSelectedOrder(ord);
                                      setTicketOpen(true);
                                    }}
                                  >
                                    <UiIcon name="print" size={13} /> Ticket
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

              {activeSection === "inventory" && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div className="panel-filter-bar">
                      <input
                        type="search"
                        aria-label="Search materials"
                        placeholder="Search SKU, fabric, or supplier..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="table-select"
                        style={{ minWidth: 220 }}
                      />
                    </div>
                  </div>
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Materials lookup table"
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
                                padding: 24,
                                color: "var(--muted)",
                              }}
                            >
                              No matching materials found in stock.
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
                                    {item.sku}, Batch {item.batchLot}
                                  </span>
                                </th>
                                <td>{item.category}</td>
                                <td className="mono">
                                  <strong>
                                    {item.stockLevel.toLocaleString()}{" "}
                                    {item.unit}
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
            /* ==================== ADMIN / PLANT CONSOLE VIEWS ==================== */
            <>
              {/* VIEW 1: CALM SCANNABLE PLANT OVERVIEW */}
              {activeSection === "overview" && (
                <>
                  <div className="kpi-grid-4">
                    <div className="kpi-card">
                      <span className="ticket-label">Pipeline revenue</span>
                      <div className="kpi-value mono">
                        ₦{branchRevenue.toLocaleString()}
                      </div>
                      <div className="kpi-sub">
                        {orders.length} active production orders
                      </div>
                    </div>

                    <div className="kpi-card">
                      <span className="ticket-label">Est. gross margin</span>
                      <div
                        className="kpi-value mono"
                        style={{ color: "var(--ink)" }}
                      >
                        ₦{branchGrossProfit.toLocaleString()}
                      </div>
                      <div className="kpi-sub">58% target plant margin</div>
                    </div>

                    <div className="kpi-card">
                      <span className="ticket-label">Plant team</span>
                      <div className="kpi-value mono">
                        {branchStaff.length} Members
                      </div>
                      <div className="kpi-sub">
                        {clockedInCount} currently clocked in
                      </div>
                    </div>

                    <div className="kpi-card">
                      <span className="ticket-label">Stock alerts</span>
                      <div className="kpi-value mono">
                        {lowStockItems.length} Low
                      </div>
                      <div className="kpi-sub">
                        Materials under 14-day runway
                      </div>
                    </div>
                  </div>

                  {/* Recent Production Orders Summary Card (max 5 rows) */}
                  <div className="workspace-panel" style={{ marginBottom: 24 }}>
                    <div className="panel-header-row">
                      <div>
                        <h3>Recent Production Orders</h3>
                        <p>
                          Latest client runs and floor stage progress for{" "}
                          {activeBranch?.name || "this plant"}.
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => setActiveSection("orders")}
                        >
                          All orders ({orders.length})
                        </button>
                      </div>
                    </div>

                    {orders.length === 0 ? (
                      <div className="console-empty-state">
                        <p>
                          No active production orders yet for{" "}
                          {activeBranch?.name || "this plant"}.
                        </p>
                        <button
                          type="button"
                          className="button button-dark"
                          style={{ minHeight: 38 }}
                          onClick={() => setCreateOrderModalOpen(true)}
                        >
                          + Create First Order
                        </button>
                      </div>
                    ) : (
                      <div className="summary-list">
                        {orders.slice(0, 5).map((ord) => (
                          <div key={ord.jobCode} className="summary-list-row">
                            <div className="summary-list-primary">
                              <div className="summary-row-title">
                                <span className="mono">{ord.jobCode}</span>
                                <strong>{ord.company}</strong>
                                <span className="mkp-badge mkp-badge-olive">
                                  {STAGE_METADATA[ord.stage].stepNumber}.{" "}
                                  {STAGE_METADATA[ord.stage].shortLabel}
                                </span>
                              </div>
                              <div className="summary-row-sub">
                                {ord.garmentCategory},{" "}
                                {ord.exactQuantity.toLocaleString()} pcs, ₦
                                {ord.totalQuoteNgn.toLocaleString()}, Due{" "}
                                {ord.targetDeliveryDate}
                              </div>
                            </div>
                            <div className="summary-list-actions">
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
                              <button
                                type="button"
                                className="mkp-inline-btn"
                                onClick={() =>
                                  handleOpenOrCreateOrderInvoice(ord)
                                }
                              >
                                <UiIcon name="receipt" size={13} /> Invoice
                              </button>
                              <button
                                type="button"
                                className="mkp-inline-btn"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setTicketOpen(true);
                                }}
                              >
                                <UiIcon name="print" size={13} /> Ticket
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scannable 2-Card Operational Snapshot */}
                  <div className="overview-summary-grid">
                    {/* Card A: Materials & Stock Health */}
                    <div className="workspace-panel">
                      <div className="panel-header-row">
                        <div>
                          <h3>Materials &amp; Stock Health</h3>
                          <p>
                            {lowStockItems.length > 0
                              ? `${lowStockItems.length} material(s) under 14-day cutting runway.`
                              : "All registered fabrics and trims have healthy runway."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => setActiveSection("inventory")}
                        >
                          Manage stock
                        </button>
                      </div>

                      {inventory.length === 0 ? (
                        <div className="console-empty-state">
                          <p>No fabric rolls or trim SKUs registered yet.</p>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setCreateSkuModalOpen(true)}
                          >
                            + Add first material
                          </button>
                        </div>
                      ) : (
                        <div className="summary-list">
                          {(lowStockItems.length > 0
                            ? lowStockItems
                            : inventory
                          )
                            .slice(0, 4)
                            .map((item) => {
                              const days =
                                item.stockLevel /
                                Math.max(1, item.dailyBurnRate);
                              return (
                                <div
                                  key={item.id}
                                  className="summary-list-row"
                                >
                                  <div className="summary-list-primary">
                                    <div className="summary-row-title">
                                      <strong>{item.name}</strong>
                                    </div>
                                    <div className="summary-row-sub mono">
                                      {item.sku},{" "}
                                      {item.stockLevel.toLocaleString()}{" "}
                                      {item.unit}
                                    </div>
                                  </div>
                                  <div className="summary-list-actions">
                                    <span
                                      className={`mkp-badge ${
                                        days < 7
                                          ? "mkp-badge-critical"
                                          : days < 14
                                          ? "mkp-badge-warn"
                                          : "mkp-badge-olive"
                                      }`}
                                    >
                                      {days.toFixed(0)}d left
                                    </span>
                                    <button
                                      type="button"
                                      className="mkp-inline-btn"
                                      onClick={() =>
                                        handleQuickRestockSku(item, 100)
                                      }
                                    >
                                      +100
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Card B: Plant Team & Shift Summary */}
                    <div className="workspace-panel">
                      <div className="panel-header-row">
                        <div>
                          <h3>Plant Team &amp; Shifts</h3>
                          <p>
                            {clockedInCount} of {branchStaff.length} team
                            members active on shift.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => setActiveSection("roster")}
                        >
                          Manage team
                        </button>
                      </div>

                      {branchStaff.length === 0 ? (
                        <div className="console-empty-state">
                          <p>No team members assigned to this plant yet.</p>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setCreateStaffModalOpen(true)}
                          >
                            + Add team member
                          </button>
                        </div>
                      ) : (
                        <div className="summary-list">
                          {branchStaff.slice(0, 4).map((sp) => (
                            <div key={sp.id} className="summary-list-row">
                              <div className="summary-list-primary">
                                <div className="summary-row-title">
                                  <strong>{sp.name}</strong>
                                  <span className="size-pill-item">
                                    {ARTISAN_ROLE_LABELS[sp.role]}
                                  </span>
                                </div>
                                <div className="summary-row-sub">
                                  {sp.station}, {sp.qcPassRate.toFixed(1)}% QC
                                </div>
                              </div>
                              <div className="summary-list-actions mono">
                                <span
                                  style={{
                                    fontSize: 11,
                                    color:
                                      sp.shiftStatus === "CLOCKED_IN"
                                        ? "var(--ink)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {sp.shiftStatus === "CLOCKED_IN"
                                    ? "On shift"
                                    : "Off shift"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* VIEW 2: FULL-WIDTH PRODUCTION ORDERS */}
              {activeSection === "orders" && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div className="panel-filter-bar">
                      <input
                        type="search"
                        aria-label="Search orders"
                        placeholder="Search job code, brand, or category..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="table-select"
                        style={{ minWidth: 240 }}
                      />
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)" }}
                      >
                        Showing {filteredAdminOrders.length} of {orders.length}{" "}
                        orders
                      </span>
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Production orders table"
                    className="table-wrapper"
                  >
                    <table
                      className="size-chart responsive-data-table"
                      style={
                        {
                          "--label-1": "Order & Client",
                          "--label-2": "Garment & Value",
                          "--label-3": "Stage",
                          "--label-4": "Assigned Leads",
                          "--label-5": "Floor Progress",
                          "--label-6": "Actions",
                        } as React.CSSProperties
                      }
                    >
                      <thead>
                        <tr>
                          <th>Order &amp; Client</th>
                          <th>Garment &amp; Value</th>
                          <th>Stage</th>
                          <th>Assigned Leads</th>
                          <th>Floor Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdminOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                textAlign: "center",
                                padding: 24,
                                color: "var(--muted)",
                              }}
                            >
                              No production orders match this view. Click{" "}
                              <strong>+ New Order</strong> above to create one.
                            </td>
                          </tr>
                        ) : (
                          filteredAdminOrders.map((ord) => (
                            <tr key={ord.jobCode}>
                              <th>
                                <div className="mono">{ord.jobCode}</div>
                                <div style={{ fontWeight: 600 }}>
                                  {ord.company}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 400,
                                    color: "var(--muted)",
                                  }}
                                >
                                  Due {ord.targetDeliveryDate}
                                </div>
                              </th>
                              <td>
                                <div>{ord.garmentCategory}</div>
                                <div className="mono" style={{ fontSize: 11 }}>
                                  <strong>
                                    {ord.exactQuantity.toLocaleString()} pcs
                                  </strong>
                                  , ₦{ord.totalQuoteNgn.toLocaleString()}
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
                                  <strong>Tailor:</strong>{" "}
                                  {ord.assignedTailorLead}
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
                                  QC Passed:{" "}
                                  <strong>{ord.unitsPassedQc}</strong> pcs
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
                                    onClick={() =>
                                      handleOpenOrCreateOrderInvoice(ord)
                                    }
                                  >
                                    <UiIcon name="receipt" size={13} /> Invoice
                                  </button>
                                  <button
                                    type="button"
                                    className="mkp-inline-btn"
                                    onClick={() => {
                                      setSelectedOrder(ord);
                                      setTicketOpen(true);
                                    }}
                                  >
                                    <UiIcon name="print" size={13} /> Ticket
                                  </button>
                                  <button
                                    type="button"
                                    className="mkp-inline-btn mkp-inline-btn-danger"
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

              {/* VIEW 2B: FULL-WIDTH CLIENT INVOICING & OFFICIAL RECEIPTS */}
              {activeSection === "invoicing" && (
                <InvoicingLedgerPanel
                  actorName={user.name}
                  branchId={activeBranch?.id}
                  orders={orders}
                  onNotice={showToast}
                />
              )}

              {/* VIEW 3: FULL-WIDTH TEAM ROSTER */}
              {activeSection === "roster" && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div className="panel-filter-bar">
                      <input
                        type="search"
                        aria-label="Search team roster"
                        placeholder="Search name, email, or station..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        className="table-select"
                        style={{ minWidth: 240 }}
                      />
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)" }}
                      >
                        {filteredBranchStaff.length} team member(s)
                      </span>
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Plant team roster table"
                    className="table-wrapper"
                  >
                    <table
                      className="size-chart responsive-data-table"
                      style={
                        {
                          "--label-1": "Team Member",
                          "--label-2": "Role & Tier",
                          "--label-3": "Station & Shift",
                          "--label-4": "Output & QC",
                          "--label-5": "Actions",
                        } as React.CSSProperties
                      }
                    >
                      <thead>
                        <tr>
                          <th>Team Member</th>
                          <th>Role &amp; Tier</th>
                          <th>Station &amp; Shift</th>
                          <th>Output &amp; QC</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBranchStaff.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                textAlign: "center",
                                padding: 24,
                                color: "var(--muted)",
                              }}
                            >
                              No team members match your search.
                            </td>
                          </tr>
                        ) : (
                          filteredBranchStaff.map((sp) => (
                            <tr key={sp.id}>
                              <th>
                                <div>{sp.name}</div>
                                <div
                                  className="mono"
                                  style={{
                                    fontSize: 10.5,
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
                                    gap: 6,
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
                              </td>
                              <td>
                                <div>{sp.station}</div>
                                <div
                                  className="mono"
                                  style={{
                                    fontSize: 10.5,
                                    color: "var(--muted)",
                                  }}
                                >
                                  {sp.shiftStatus === "CLOCKED_IN"
                                    ? "Clocked in"
                                    : "Off shift"}
                                </div>
                              </td>
                              <td className="mono">
                                <div>
                                  <strong>
                                    {sp.unitsCompletedMonth.toLocaleString()}{" "}
                                    pcs
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
                                      className="mkp-inline-btn mkp-inline-btn-danger"
                                      onClick={() => handleDeleteBranchStaff(sp)}
                                    >
                                      Delete
                                    </button>
                                  )}
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

              {/* VIEW 4: FULL-WIDTH MATERIALS & STOCK */}
              {activeSection === "inventory" && (
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div className="panel-filter-bar">
                      <input
                        type="search"
                        aria-label="Search materials and SKUs"
                        placeholder="Search SKU, fabric, or supplier..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="table-select"
                        style={{ minWidth: 240 }}
                      />
                      <button
                        type="button"
                        className={`mkp-inline-btn ${
                          showLowStockOnly ? "mkp-inline-btn-active" : ""
                        }`}
                        onClick={() => setShowLowStockOnly((v) => !v)}
                      >
                        {showLowStockOnly
                          ? `Low Stock (${lowStockItems.length})`
                          : `Filter Low Stock (${lowStockItems.length})`}
                      </button>
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Materials and stock table"
                    className="table-wrapper"
                  >
                    <table
                      className="size-chart responsive-data-table"
                      style={
                        {
                          "--label-1": "Material & SKU",
                          "--label-2": "Category & Supplier",
                          "--label-3": "Stock & Runway",
                          "--label-4": "Unit Cost",
                          "--label-5": "Actions",
                        } as React.CSSProperties
                      }
                    >
                      <thead>
                        <tr>
                          <th>Material &amp; SKU</th>
                          <th>Category &amp; Supplier</th>
                          <th>Stock &amp; Runway</th>
                          <th>Unit Cost</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedInventory.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                textAlign: "center",
                                padding: 24,
                                color: "var(--muted)",
                              }}
                            >
                              No materials match this filter. Click{" "}
                              <strong>+ Add Material</strong> above to register
                              stock.
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
                                      fontSize: 10.5,
                                      fontWeight: 400,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {item.sku}, Batch {item.batchLot}
                                  </span>
                                </th>
                                <td>
                                  <div>{item.category}</div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {item.supplierName}
                                  </div>
                                </td>
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
                                <td className="mono">
                                  ₦{item.costPerUnitNgn.toLocaleString()} /{" "}
                                  {item.unit}
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {isManager && (
                                      <>
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
                                          className="mkp-inline-btn mkp-inline-btn-danger"
                                          onClick={() => handleDeleteSku(item)}
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
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
            </>
          )}
        </section>
      </div>

      <ProductionJobTicketModal
        order={selectedOrder}
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
      />

      <InvoiceDocumentModal
        invoice={quickInvoiceDoc}
        open={Boolean(quickInvoiceDoc)}
        onClose={() => setQuickInvoiceDoc(null)}
        onRecordPayment={() => {
          setQuickInvoiceDoc(null);
          setActiveSection("invoicing");
        }}
      />

      {/* CREATE PRODUCTION ORDER MODAL */}
      <ModalDialog
        open={createOrderModalOpen}
        onClose={() => setCreateOrderModalOpen(false)}
        title="New Production Order"
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
              Create Order
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
        title={`Edit Order — ${editingOrder?.jobCode || ""}`}
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
                Save Changes
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

      {/* CREATE TEAM MEMBER MODAL */}
      <ModalDialog
        open={createStaffModalOpen}
        onClose={() => setCreateStaffModalOpen(false)}
        title={`Add Team Member — ${activeBranch?.name || SURULERE_BRANCH_NAME}`}
        maxWidth={540}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleCreateBranchStaff}
        >
          <div className="form-row">
            <label>
              Access Level *
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
                <option value="staff">Staff (Artisan / Specialist)</option>
                <option value="admin">Admin (Plant Manager)</option>
                {isSuper && (
                  <option value="superadmin">Superadmin (Global HQ)</option>
                )}
              </select>
            </label>
            <label>
              Role *
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
                placeholder="e.g. Sewing Line 2"
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
                8+ characters (optional)
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
                Assigned machinery or QA scope
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
              Add Team Member
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

      {/* EDIT TEAM MEMBER MODAL */}
      <ModalDialog
        open={Boolean(editingStaff)}
        onClose={() => {
          setEditStaffPassword("");
          setEditingStaff(null);
        }}
        title={`Edit Team Member — ${editingStaff?.name || ""}`}
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
                Access Level *
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
                  <option value="admin">Admin (Plant Manager)</option>
                  <option value="staff">Staff (Artisan / Specialist)</option>
                  {isSuper && (
                    <option value="superadmin">Superadmin (Global HQ)</option>
                  )}
                </select>
              </label>
              <label>
                Role *
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
              Reset Sign-In Password (Optional)
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 400,
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                8+ characters (clears any failed-login lockout)
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
                Save Changes
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

      {/* CREATE MATERIAL MODAL */}
      <ModalDialog
        open={createSkuModalOpen}
        onClose={() => setCreateSkuModalOpen(false)}
        title="Add Fabric or Trim Material"
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
              Add Material
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

      {/* EDIT MATERIAL MODAL */}
      <ModalDialog
        open={Boolean(editingSku)}
        onClose={() => setEditingSku(null)}
        title={`Edit Material — ${editingSku?.sku || ""}`}
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
                Save Changes
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
