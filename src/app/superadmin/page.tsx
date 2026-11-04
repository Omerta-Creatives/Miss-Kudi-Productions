"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ACCESS_TIER_LABELS,
  appendAuditLog,
  ARTISAN_ROLE_LABELS,
  ArtisanRole,
  ArtisanStaff,
  AuditLogEntry,
  FactoryBranch,
  getCurrentSessionUser,
  isSuperAdminUser,
  loadArtisans,
  loadAuditLogs,
  loadBranches,
  loadExpenses,
  loadOrders,
  saveArtisans,
  saveBranches,
  saveLocalPasswordHash,
  setActiveBranchId,
  setCurrentSessionUser,
  UserAccessTier,
} from "../lib/production-os";
import { ModalDialog } from "../components/ProductionJobTicketModal";

export default function SuperadminHqPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ArtisanStaff>(() =>
    getCurrentSessionUser()
  );
  const [branches, setBranches] = useState<FactoryBranch[]>([]);
  const [artisans, setArtisans] = useState<ArtisanStaff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [globalGmv, setGlobalGmv] = useState(0);
  const [globalOpEx, setGlobalOpEx] = useState(0);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSection, setActiveSection] = useState<
    "overview" | "accounts" | "facilities" | "audit"
  >("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const [dbVerifying, setDbVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modals for Facility Branch CRUD
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<FactoryBranch | null>(
    null
  );
  const [deletingBranch, setDeletingBranch] = useState<FactoryBranch | null>(
    null
  );

  // Modals for Superadmin / Admin / Staff CRUD
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ArtisanStaff | null>(null);
  const [editStaffPassword, setEditStaffPassword] = useState("");
  const [deletingStaff, setDeletingStaff] = useState<ArtisanStaff | null>(null);

  const [newBranch, setNewBranch] = useState({
    name: "",
    location: "",
    specialization: "Bulk Apparel Sewing, Cutting & Quality Control",
    machineCount: 24,
    fabricMetersStock: 1000,
    status: "ACTIVE" as FactoryBranch["status"],
  });

  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
    accessTier: "admin" as UserAccessTier,
    role: "production_manager" as ArtisanRole,
    branchId: "br-yaba",
    station: "Executive HQ · Lagos",
    specialty: "Multi-Facility Operations & Production Governance",
    shiftStatus: "CLOCKED_IN" as ArtisanStaff["shiftStatus"],
  });

  const refreshData = () => {
    setCurrentUser(getCurrentSessionUser());
    const b = loadBranches();
    const a = loadArtisans();
    const o = loadOrders();
    const e = loadExpenses();
    setBranches(b);
    setArtisans(a);
    setAuditLogs(loadAuditLogs());
    setOrdersCount(o.length);
    setGlobalGmv(o.reduce((sum, item) => sum + item.totalQuoteNgn, 0));
    setGlobalOpEx(e.reduce((sum, item) => sum + item.amountNgn, 0));
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("mkp:session-change", refreshData);
    return () => window.removeEventListener("mkp:session-change", refreshData);
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 5000);
  };

  const openCreateAccountModal = (presetTier: UserAccessTier) => {
    const defaultRole: ArtisanRole =
      presetTier === "superadmin" || presetTier === "admin"
        ? "production_manager"
        : "tailor";
    const defaultStation =
      presetTier === "superadmin"
        ? "Executive HQ · Lagos"
        : presetTier === "admin"
        ? "Plant Planning Office · Yaba"
        : "Sewing Line 1";
    const defaultSpecialty =
      presetTier === "superadmin"
        ? "Global HQ Governance, Multi-Facility P&L & Executive Strategy"
        : presetTier === "admin"
        ? "Plant Floor Scheduling, B2B Client Quotes & Artisan Dispatch"
        : "Industrial Cut-and-Sew & Quality Execution";

    setNewStaff({
      name: "",
      email: "",
      password: "",
      accessTier: presetTier,
      role: defaultRole,
      branchId: branches[0]?.id || "br-yaba",
      station: defaultStation,
      specialty: defaultSpecialty,
      shiftStatus: "CLOCKED_IN",
    });
    setStaffModalOpen(true);
  };

  const handleVerifyNeonSchema = async () => {
    setDbVerifying(true);
    try {
      const res = await fetch("/api/admin/init-db", { method: "POST" });
      const data = await res.json();
      const logs = appendAuditLog({
        action: "neondb.schema_verified",
        actor: currentUser.name,
        role: "Superadmin HQ",
        targetRef: "NEON_POSTGRES",
        summary:
          data.message ||
          "Verified Neon Serverless PostgreSQL schema & Clerk RBAC tables.",
      });
      setAuditLogs(logs);
      showNotice(
        data.message ||
          "NeonDB PostgreSQL schema & Clerk RBAC tables verified!"
      );
    } finally {
      setDbVerifying(false);
    }
  };

  // --- FACILITY BRANCH CRUD ---
  const handleProvisionBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name.trim() || !newBranch.location.trim()) return;
    setSubmitting(true);
    try {
      const created: FactoryBranch = {
        id: `br-${Date.now()}`,
        name: newBranch.name.trim(),
        location: newBranch.location.trim(),
        specialization: newBranch.specialization.trim(),
        machineCount: Number(newBranch.machineCount) || 20,
        staffCount: 1,
        fabricMetersStock: Number(newBranch.fabricMetersStock) || 500,
        netRevenueNgn: 0,
        operatingExpensesNgn: 0,
        trueNetProfitNgn: 0,
        status: newBranch.status,
      };
      const next = [...branches, created];
      setBranches(next);
      saveBranches(next);

      fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...created, actor: currentUser.name }),
      }).catch(() => {});

      const logs = appendAuditLog({
        action: "facility.provisioned",
        actor: currentUser.name,
        role: "Superadmin HQ",
        targetRef: created.name,
        summary: `Provisioned new factory branch "${created.name}" (${created.location}) with ${created.machineCount} industrial machines.`,
      });
      setAuditLogs(logs);
      setBranchModalOpen(false);
      setNewBranch({
        name: "",
        location: "",
        specialization: "Bulk Apparel Sewing, Cutting & Quality Control",
        machineCount: 24,
        fabricMetersStock: 1000,
        status: "ACTIVE",
      });
      showNotice(`Provisioned factory facility "${created.name}"!`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBranchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    setSubmitting(true);
    try {
      const next = branches.map((b) =>
        b.id === editingBranch.id ? editingBranch : b
      );
      setBranches(next);
      saveBranches(next);

      // Update branchName on any artisans assigned to this branch
      const updatedArtisans = artisans.map((a) =>
        a.branchId === editingBranch.id
          ? { ...a, branchName: editingBranch.name }
          : a
      );
      setArtisans(updatedArtisans);
      saveArtisans(updatedArtisans);

      fetch("/api/admin/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingBranch, actor: currentUser.name }),
      }).catch(() => {});

      const logs = appendAuditLog({
        action: "facility.updated",
        actor: currentUser.name,
        role: "Superadmin HQ",
        targetRef: editingBranch.name,
        summary: `Updated facility "${editingBranch.name}" (${editingBranch.location}) — ${editingBranch.machineCount} machines, ${editingBranch.fabricMetersStock.toLocaleString()}m fabric stock.`,
      });
      setAuditLogs(logs);
      setEditingBranch(null);
      showNotice(`Updated facility "${editingBranch.name}".`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteBranch = async () => {
    if (!deletingBranch) return;
    if (branches.length <= 1) {
      showNotice("Cannot delete the last remaining factory facility.");
      setDeletingBranch(null);
      return;
    }

    const fallbackBranch =
      branches.find((b) => b.id !== deletingBranch.id) || branches[0];
    const nextBranches = branches.filter((b) => b.id !== deletingBranch.id);
    setBranches(nextBranches);
    saveBranches(nextBranches);

    // Reassign any staff on the deleted branch to the fallback branch
    const nextArtisans = artisans.map((a) =>
      a.branchId === deletingBranch.id
        ? {
            ...a,
            branchId: fallbackBranch.id,
            branchName: fallbackBranch.name,
          }
        : a
    );
    setArtisans(nextArtisans);
    saveArtisans(nextArtisans);

    fetch(
      `/api/admin/branches?id=${encodeURIComponent(
        deletingBranch.id
      )}&actor=${encodeURIComponent(currentUser.name)}`,
      { method: "DELETE" }
    ).catch(() => {});

    const logs = appendAuditLog({
      action: "facility.deleted",
      actor: currentUser.name,
      role: "Superadmin HQ",
      targetRef: deletingBranch.name,
      summary: `Removed factory branch "${deletingBranch.name}" and reassigned staff to ${fallbackBranch.name}.`,
    });
    setAuditLogs(logs);
    showNotice(
      `Deleted facility "${deletingBranch.name}". Staff reassigned to ${fallbackBranch.name}.`
    );
    setDeletingBranch(null);
  };

  const handleInspectBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    router.push("/dashboard");
  };

  // --- SUPERADMIN, ADMIN & STAFF RBAC CRUD ---
  const handleUpdateUserGovernance = (
    userId: string,
    updates: Partial<ArtisanStaff>
  ) => {
    const existingTarget = artisans.find((u) => u.id === userId);
    if (
      existingTarget &&
      existingTarget.accessTier === "superadmin" &&
      updates.accessTier &&
      updates.accessTier !== "superadmin"
    ) {
      const superCount = artisans.filter(
        (a) => a.accessTier === "superadmin"
      ).length;
      if (superCount <= 1) {
        showNotice(
          "Cannot demote the last remaining Superadmin account."
        );
        return;
      }
    }

    const next = artisans.map((u) => {
      if (u.id !== userId) return u;
      const updatedBranch = updates.branchId
        ? branches.find((b) => b.id === updates.branchId)
        : undefined;
      return {
        ...u,
        ...updates,
        branchName: updatedBranch ? updatedBranch.name : u.branchName,
      };
    });
    setArtisans(next);
    saveArtisans(next);

    const target = next.find((u) => u.id === userId);
    if (target) {
      if (target.id === currentUser.id) {
        setCurrentSessionUser(target);
      }
      fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, actor: currentUser.name }),
      }).catch(() => {});

      const logs = appendAuditLog({
        action: "rbac.role_updated",
        actor: currentUser.name,
        role: "Superadmin HQ",
        targetRef: target.email,
        summary: `Updated ${target.name} → Tier: ${target.accessTier.toUpperCase()} · Role: ${
          ARTISAN_ROLE_LABELS[target.role]
        } · Branch: ${target.branchName}.`,
      });
      setAuditLogs(logs);
      showNotice(
        `Updated ${target.name} → ${target.accessTier.toUpperCase()} (${
          ARTISAN_ROLE_LABELS[target.role]
        }).`
      );
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;
    setSubmitting(true);
    try {
      const targetBranch =
        branches.find((b) => b.id === newStaff.branchId) || branches[0];
      const created: ArtisanStaff = {
        id: `art-${Date.now()}`,
        name: newStaff.name.trim(),
        email: newStaff.email.trim().toLowerCase(),
        accessTier: newStaff.accessTier,
        role: newStaff.role,
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        station: newStaff.station.trim() || "Main Factory Floor",
        specialty:
          newStaff.specialty.trim() ||
          `${ARTISAN_ROLE_LABELS[newStaff.role]} Specialist`,
        activeRuns: 1,
        unitsCompletedMonth: 0,
        qcPassRate: 99.5,
        shiftStatus: newStaff.shiftStatus,
        status:
          newStaff.accessTier === "superadmin"
            ? "Executive HQ"
            : newStaff.role === "pattern_designer"
            ? "Pattern Studio"
            : newStaff.role === "quality_control"
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
          password: newStaff.password.trim() || undefined,
          actor: currentUser.name,
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
        action: "rbac.user_created",
        actor: currentUser.name,
        role: "Superadmin HQ",
        targetRef: created.email,
        summary: `Provisioned ${created.accessTier.toUpperCase()} account for ${created.name} (${
          ARTISAN_ROLE_LABELS[created.role]
        }) at ${created.branchName}.`,
      });
      setAuditLogs(logs);
      setStaffModalOpen(false);
      showNotice(
        `Created ${created.accessTier.toUpperCase()} account for ${created.name}!`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const original = artisans.find((a) => a.id === editingStaff.id);
    if (
      original?.accessTier === "superadmin" &&
      editingStaff.accessTier !== "superadmin"
    ) {
      const superCount = artisans.filter(
        (a) => a.accessTier === "superadmin"
      ).length;
      if (superCount <= 1) {
        showNotice("Cannot demote the last remaining Superadmin account.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const matchedBranch =
        branches.find((b) => b.id === editingStaff.branchId) || branches[0];
      const updatedRecord: ArtisanStaff = {
        ...editingStaff,
        name: editingStaff.name.trim(),
        email: editingStaff.email.trim().toLowerCase(),
        branchName: matchedBranch ? matchedBranch.name : editingStaff.branchName,
      };

      const next = artisans.map((a) =>
        a.id === updatedRecord.id ? updatedRecord : a
      );
      setArtisans(next);
      saveArtisans(next);

      if (updatedRecord.id === currentUser.id) {
        setCurrentSessionUser(updatedRecord);
      }

      const nextPassword = editStaffPassword.trim();
      fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedRecord,
          password: nextPassword || undefined,
          actor: currentUser.name,
        }),
      })
        .then((r) => r.json())
        .then((resData) => {
          if (resData?.passwordHash) {
            saveLocalPasswordHash(updatedRecord.email, resData.passwordHash);
          }
        })
        .catch(() => {});

      const logs = appendAuditLog({
        action: "rbac.user_updated",
        actor: currentUser.name,
        role: "Superadmin HQ",
        targetRef: updatedRecord.email,
        summary: `Edited ${updatedRecord.accessTier.toUpperCase()} profile for ${updatedRecord.name} (${
          ARTISAN_ROLE_LABELS[updatedRecord.role]
        } · ${updatedRecord.station})${
          nextPassword ? " and rotated login password" : ""
        }.`,
      });
      setAuditLogs(logs);
      setEditStaffPassword("");
      setEditingStaff(null);
      showNotice(
        `Saved updates for ${updatedRecord.name} (${updatedRecord.accessTier.toUpperCase()})${
          nextPassword ? " · password rotated" : ""
        }.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!deletingStaff) return;
    if (deletingStaff.id === currentUser.id) {
      showNotice("You cannot delete your own active Superadmin session account.");
      setDeletingStaff(null);
      return;
    }
    if (deletingStaff.accessTier === "superadmin") {
      const superCount = artisans.filter(
        (a) => a.accessTier === "superadmin"
      ).length;
      if (superCount <= 1) {
        showNotice("Cannot delete the last remaining Superadmin account.");
        setDeletingStaff(null);
        return;
      }
    }

    const next = artisans.filter((a) => a.id !== deletingStaff.id);
    setArtisans(next);
    saveArtisans(next);

    fetch(
      `/api/admin/users?id=${encodeURIComponent(
        deletingStaff.id
      )}&email=${encodeURIComponent(
        deletingStaff.email
      )}&actor=${encodeURIComponent(currentUser.name)}`,
      { method: "DELETE" }
    ).catch(() => {});

    const logs = appendAuditLog({
      action: "rbac.user_deleted",
      actor: currentUser.name,
      role: "Superadmin HQ",
      targetRef: deletingStaff.email,
      summary: `Revoked and deleted ${deletingStaff.accessTier.toUpperCase()} account for ${deletingStaff.name} (${deletingStaff.email}).`,
    });
    setAuditLogs(logs);
    showNotice(
      `Deleted ${deletingStaff.accessTier.toUpperCase()} account for ${deletingStaff.name}.`
    );
    setDeletingStaff(null);
  };

  // Guard if non-superadmin visits /superadmin
  if (!isSuperAdminUser(currentUser)) {
    return (
      <main className="section-wrap" style={{ paddingBlock: 72 }}>
        <div
          className="workspace-panel"
          style={{ maxWidth: 620, marginInline: "auto" }}
        >
          <span className="mkp-badge mkp-badge-critical">
            SUPERADMIN CLEARANCE REQUIRED
          </span>
          <h2 style={{ marginTop: 12, fontSize: 28 }}>
            Restricted Global HQ Control Center
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
            You are currently signed in as <strong>{currentUser.name}</strong> (
            <code>{currentUser.accessTier.toUpperCase()}</code> ·{" "}
            {ARTISAN_ROLE_LABELS[currentUser.role]}). Only{" "}
            <strong>Superadmin</strong> accounts can provision factory facilities
            or modify global RBAC permissions.
          </p>
          <div
            style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}
          >
            <Link className="button button-dark" href="/dashboard">
              Go to My {currentUser.accessTier === "admin" ? "Admin" : "Staff"}{" "}
              Dashboard <span>→</span>
            </Link>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => {
                const superAccount = artisans.find(
                  (a) => a.accessTier === "superadmin"
                );
                if (superAccount) setCurrentSessionUser(superAccount);
              }}
            >
              Switch to Superadmin Account <span>★</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const estimatedCogs = Math.round(globalGmv * 0.42);
  const globalTrueNetProfit = globalGmv - estimatedCogs - globalOpEx;
  const totalMachines = branches.reduce((acc, b) => acc + b.machineCount, 0);

  const superadminCount = artisans.filter(
    (a) => a.accessTier === "superadmin"
  ).length;
  const adminCount = artisans.filter((a) => a.accessTier === "admin").length;
  const staffCount = artisans.filter((a) => a.accessTier === "staff").length;

  const filteredArtisans = artisans.filter((u) => {
    const matchBranch =
      branchFilter === "all" || u.branchId === branchFilter;
    const matchTier =
      tierFilter === "all" ||
      u.accessTier === tierFilter ||
      u.role === tierFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.station.toLowerCase().includes(q) ||
      u.specialty.toLowerCase().includes(q);
    return matchBranch && matchTier && matchSearch;
  });

  const userInitials = currentUser.name
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
        {/* SUPERADMIN GLOBAL HQ SIDEBAR */}
        <aside
          className="dashboard-sidebar"
          aria-label="Superadmin Global HQ Sidebar"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Identity Card */}
            <div className="sidebar-identity-card">
              <div className="sidebar-identity-top">
                <span className="sidebar-avatar" aria-hidden="true">
                  {userInitials}
                </span>
                <div className="sidebar-identity-meta">
                  <div className="sidebar-user-name">{currentUser.name}</div>
                  <div className="sidebar-user-email">{currentUser.email}</div>
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
                  SUPERADMIN HQ ★
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)" }}
                >
                  All Plants · Lagos
                </span>
              </div>
            </div>

            {/* HQ Navigation Modules */}
            <nav aria-label="Superadmin HQ Modules">
              <div className="sidebar-section-label">HQ GOVERNANCE MODULES</div>
              <ul className="sidebar-nav-list">
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "overview" && tierFilter === "all"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveSection("overview");
                      setTierFilter("all");
                    }}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ◈
                      </span>
                      <span>Executive Overview</span>
                    </span>
                    <span className="sidebar-nav-badge">ALL</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "accounts" && tierFilter === "all"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveSection("accounts");
                      setTierFilter("all");
                    }}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ⊞
                      </span>
                      <span>All RBAC Accounts CRUD</span>
                    </span>
                    <span className="sidebar-nav-badge">{artisans.length}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "accounts" &&
                      tierFilter === "superadmin"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveSection("accounts");
                      setTierFilter("superadmin");
                    }}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ★
                      </span>
                      <span>Superadmins</span>
                    </span>
                    <span className="sidebar-nav-badge">{superadminCount}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "accounts" && tierFilter === "admin"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveSection("accounts");
                      setTierFilter("admin");
                    }}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ◆
                      </span>
                      <span>Factory Admins</span>
                    </span>
                    <span className="sidebar-nav-badge">{adminCount}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "accounts" && tierFilter === "staff"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveSection("accounts");
                      setTierFilter("staff");
                    }}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ⚙
                      </span>
                      <span>Floor Specialists</span>
                    </span>
                    <span className="sidebar-nav-badge">{staffCount}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "facilities" ? "active" : ""
                    }`}
                    onClick={() => setActiveSection("facilities")}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ⌂
                      </span>
                      <span>Facility Branches CRUD</span>
                    </span>
                    <span className="sidebar-nav-badge">{branches.length}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "audit" ? "active" : ""
                    }`}
                    onClick={() => setActiveSection("audit")}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ⛨
                      </span>
                      <span>Security &amp; Audit Trail</span>
                    </span>
                    <span className="sidebar-nav-badge">
                      {auditLogs.length}
                    </span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* Quick Provisioning Actions */}
            <div>
              <div className="sidebar-section-label">QUICK PROVISIONING</div>
              <div className="sidebar-action-stack">
                <button
                  type="button"
                  className="sidebar-quick-btn primary"
                  onClick={() => openCreateAccountModal("admin")}
                >
                  <span>+ New Factory Admin</span>
                  <span aria-hidden="true">⊞</span>
                </button>
                <button
                  type="button"
                  className="sidebar-quick-btn"
                  onClick={() => openCreateAccountModal("superadmin")}
                >
                  <span>+ New Superadmin</span>
                  <span aria-hidden="true">★</span>
                </button>
                <button
                  type="button"
                  className="sidebar-quick-btn"
                  onClick={() => openCreateAccountModal("staff")}
                >
                  <span>+ New Floor Specialist</span>
                  <span aria-hidden="true">⚙</span>
                </button>
                <button
                  type="button"
                  className="sidebar-quick-btn"
                  onClick={() => setBranchModalOpen(true)}
                >
                  <span>+ Provision Facility Branch</span>
                  <span aria-hidden="true">⌂</span>
                </button>
              </div>
            </div>
          </div>

          {/* System Telemetry Status Footer */}
          <div className="sidebar-footer-card">
            <div className="sidebar-section-label" style={{ marginTop: 0 }}>
              INFRASTRUCTURE STATUS
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
                background: "#fff",
                border: "1px solid var(--line)",
                padding: "10px 12px",
              }}
            >
              <div style={{ color: "var(--ink)", fontWeight: 700 }}>
                ● NeonDB PostgreSQL Active
              </div>
              <div>Clerk RBAC Governance Sync</div>
              <div>{branches.length} Plants · {artisans.length} Active Accounts</div>
            </div>
          </div>
        </aside>

        {/* MAIN SUPERADMIN WORKSPACE */}
        <section className="dashboard-main">
          {/* Unified Superadmin Command Topbar & Module Bar */}
          <div className="superadmin-command-header">
            <div className="superadmin-topbar-row">
              <div className="superadmin-topbar-left">
                <button
                  type="button"
                  className="sidebar-toggle-btn"
                  aria-expanded={!sidebarCollapsed}
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                >
                  <span aria-hidden="true">☰</span>
                  {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
                </button>
                <div className="superadmin-breadcrumb mono">
                  <span>EXECUTIVE HQ</span>
                  <span aria-hidden="true">/</span>
                  <strong>{activeSection.toUpperCase()}</strong>
                </div>
              </div>

              <nav
                className="superadmin-module-tabs"
                aria-label="Superadmin Workspace View Switcher"
              >
                <button
                  type="button"
                  className={`superadmin-module-tab ${
                    activeSection === "overview" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveSection("overview");
                    setTierFilter("all");
                  }}
                >
                  <span>◈ Overview</span>
                </button>
                <button
                  type="button"
                  className={`superadmin-module-tab ${
                    activeSection === "accounts" ? "active" : ""
                  }`}
                  onClick={() => setActiveSection("accounts")}
                >
                  <span>⊞ RBAC Accounts</span>
                  <small className="mono">{artisans.length}</small>
                </button>
                <button
                  type="button"
                  className={`superadmin-module-tab ${
                    activeSection === "facilities" ? "active" : ""
                  }`}
                  onClick={() => setActiveSection("facilities")}
                >
                  <span>⌂ Facilities</span>
                  <small className="mono">{branches.length}</small>
                </button>
                <button
                  type="button"
                  className={`superadmin-module-tab ${
                    activeSection === "audit" ? "active" : ""
                  }`}
                  onClick={() => setActiveSection("audit")}
                >
                  <span>⛨ Audit Trail</span>
                  <small className="mono">{auditLogs.length}</small>
                </button>
              </nav>
            </div>

            <div className="superadmin-title-row">
              <div className="superadmin-title-copy">
                <div className="section-kicker mono">
                  SUPERADMIN GLOBAL HQ · NEONDB SERVERLESS &amp; CLERK RBAC CRUD
                </div>
                <h2>
                  Multi-Facility Command &amp;{" "}
                  <em>RBAC Governance.</em>
                </h2>
              </div>

              <div className="superadmin-action-toolbar">
                <button
                  type="button"
                  className="button button-light"
                  onClick={handleVerifyNeonSchema}
                  disabled={dbVerifying}
                >
                  {dbVerifying ? "Verifying NeonDB..." : "Verify NeonDB"}{" "}
                  <span>⚡</span>
                </button>
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => setBranchModalOpen(true)}
                >
                  + Provision Facility <span>⌂</span>
                </button>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => openCreateAccountModal("admin")}
                >
                  + New RBAC Account <span>★</span>
                </button>
              </div>
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

          {/* 1. GLOBAL ENTERPRISE KPI CARDS */}
          <div className="kpi-grid-4">
            <div className="kpi-card">
              <span className="ticket-label">GLOBAL PRODUCTION GMV (ALL PLANTS)</span>
              <div className="kpi-value mono">
                ₦{globalGmv.toLocaleString()}
              </div>
              <div className="kpi-sub">
                {ordersCount} active B2B runs across {branches.length} Lagos facilities
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">GLOBAL TRUE OPERATING NET PROFIT</span>
              <div className="kpi-value mono" style={{ color: "var(--ink)" }}>
                ₦{globalTrueNetProfit.toLocaleString()}
              </div>
              <div className="kpi-sub">
                COGS: ₦{estimatedCogs.toLocaleString()} · OpEx: ₦
                {globalOpEx.toLocaleString()}
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">FACILITIES &amp; INDUSTRIAL MACHINES</span>
              <div className="kpi-value mono">
                {branches.length} Plants · {totalMachines} Looms
              </div>
              <div className="kpi-sub">
                Yaba Flagship · Victoria Island Atelier · Ikeja Export Depot
              </div>
            </div>

            <div className="kpi-card">
              <span className="ticket-label">CLERK RBAC ACCOUNTS</span>
              <div className="kpi-value mono">{artisans.length} Users</div>
              <div className="kpi-sub">
                {superadminCount} Superadmin · {adminCount} Admin · {staffCount}{" "}
                Staff
              </div>
            </div>
          </div>

          {/* 2. GLOBAL CLERK RBAC: SUPERADMIN, ADMIN & STAFF CRUD TABLE */}
          {(activeSection === "overview" || activeSection === "accounts") && (
            <div className="workspace-panel" style={{ marginBottom: 24 }}>
          <div className="panel-header-row">
            <div>
              <h3>
                Superadmin, Admin &amp; Specialist Accounts CRUD (
                {filteredArtisans.length} of {artisans.length} Accounts)
              </h3>
              <p>
                Create, edit, promote/demote, or revoke{" "}
                <code>superadmin</code>, <code>admin</code>, and{" "}
                <code>staff</code> accounts with live NeonDB &amp; Clerk RBAC
                synchronization.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="mkp-inline-btn"
                onClick={() => openCreateAccountModal("superadmin")}
              >
                + Add Superadmin
              </button>
              <button
                type="button"
                className="mkp-inline-btn"
                onClick={() => openCreateAccountModal("admin")}
              >
                + Add Admin
              </button>
              <button
                type="button"
                className="mkp-inline-btn"
                onClick={() => openCreateAccountModal("staff")}
              >
                + Add Staff
              </button>
            </div>
          </div>

          {/* Tier Quick-Filter Pills + Search */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`mkp-inline-btn ${
                  tierFilter === "all" ? "active" : ""
                }`}
                style={
                  tierFilter === "all"
                    ? { background: "var(--ink)", color: "#fff" }
                    : undefined
                }
                onClick={() => setTierFilter("all")}
              >
                All Accounts ({artisans.length})
              </button>
              <button
                type="button"
                className="mkp-inline-btn"
                style={
                  tierFilter === "superadmin"
                    ? { background: "var(--ink)", color: "#fff" }
                    : undefined
                }
                onClick={() => setTierFilter("superadmin")}
              >
                ★ Superadmins ({superadminCount})
              </button>
              <button
                type="button"
                className="mkp-inline-btn"
                style={
                  tierFilter === "admin"
                    ? { background: "var(--ink)", color: "#fff" }
                    : undefined
                }
                onClick={() => setTierFilter("admin")}
              >
                ⊞ Factory Admins ({adminCount})
              </button>
              <button
                type="button"
                className="mkp-inline-btn"
                style={
                  tierFilter === "staff"
                    ? { background: "var(--ink)", color: "#fff" }
                    : undefined
                }
                onClick={() => setTierFilter("staff")}
              >
                ⚙ Floor Specialists ({staffCount})
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="search"
                aria-label="Search accounts by name, email or station"
                placeholder="Search name, email, station..."
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="table-select"
                style={{ flex: "1 1 180px", minWidth: 0 }}
              />
              <select
                aria-label="Filter by Facility Branch"
                className="table-select"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">All Facilities ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by Access Tier or Specialist Role"
                className="table-select"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="all">All Tiers &amp; Roles</option>
                <option value="superadmin">Tier: Superadmin HQ</option>
                <option value="admin">Tier: Factory Admin</option>
                <option value="staff">Tier: All Floor Staff</option>
                <option value="production_manager">
                  Role: Production Managers
                </option>
                <option value="pattern_designer">
                  Role: Pattern Designers
                </option>
                <option value="cutting_master">Role: Cutting Masters</option>
                <option value="tailor">Role: Master Tailors</option>
                <option value="quality_control">
                  Role: Quality Control (QC)
                </option>
              </select>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="superadmin-rbac-caption"
            className="table-wrapper"
          >
            <table
              className="size-chart responsive-data-table"
              style={
                {
                  "--label-1": "Staff / Admin Name",
                  "--label-2": "Access Tier (RBAC)",
                  "--label-3": "Specialist Role",
                  "--label-4": "Assigned Facility",
                  "--label-5": "Station & Output",
                  "--label-6": "QC Yield",
                  "--label-7": "CRUD Actions",
                } as React.CSSProperties
              }
            >
              <caption id="superadmin-rbac-caption" className="sr-only">
                Global superadmin, admin, and staff accounts with CRUD actions
              </caption>
              <thead>
                <tr>
                  <th>Staff / Admin Name</th>
                  <th>Access Tier (RBAC)</th>
                  <th>Specialist Role</th>
                  <th>Assigned Facility</th>
                  <th>Station &amp; Output</th>
                  <th>QC Yield</th>
                  <th>CRUD Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArtisans.map((u) => (
                  <tr key={u.id}>
                    <th>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{u.name}</span>
                        {u.accessTier === "superadmin" && (
                          <span className="mkp-badge mkp-badge-olive">HQ ★</span>
                        )}
                        {u.accessTier === "admin" && (
                          <span className="size-pill-item">ADMIN</span>
                        )}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 400,
                          color: "var(--muted)",
                        }}
                      >
                        {u.email}
                      </div>
                    </th>
                    <td>
                      <select
                        aria-label={`Access tier for ${u.name}`}
                        className="table-select"
                        value={u.accessTier}
                        onChange={(e) =>
                          handleUpdateUserGovernance(u.id, {
                            accessTier: e.target.value as UserAccessTier,
                          })
                        }
                      >
                        <option value="superadmin">SUPERADMIN (HQ)</option>
                        <option value="admin">ADMIN (Plant Manager)</option>
                        <option value="staff">STAFF (Artisan Floor)</option>
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Specialist role for ${u.name}`}
                        className="table-select"
                        value={u.role}
                        onChange={(e) =>
                          handleUpdateUserGovernance(u.id, {
                            role: e.target.value as ArtisanRole,
                          })
                        }
                      >
                        <option value="production_manager">
                          Production Manager
                        </option>
                        <option value="pattern_designer">
                          Pattern Designer
                        </option>
                        <option value="cutting_master">Cutting Master</option>
                        <option value="tailor">
                          Master Tailor / Sewing Lead
                        </option>
                        <option value="quality_control">
                          Quality Control (QC)
                        </option>
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Facility branch for ${u.name}`}
                        className="table-select"
                        value={u.branchId}
                        onChange={(e) =>
                          handleUpdateUserGovernance(u.id, {
                            branchId: e.target.value,
                          })
                        }
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ fontSize: 11.5 }}>{u.station}</div>
                      <div
                        className="mono"
                        style={{ fontSize: 10.5, color: "var(--muted)" }}
                      >
                        {u.unitsCompletedMonth.toLocaleString()} pcs/mo ·{" "}
                        {u.shiftStatus === "CLOCKED_IN"
                          ? "● Clocked In"
                          : "○ Off Shift"}
                      </div>
                    </td>
                    <td className="mono" style={{ color: "var(--ink)" }}>
                      <strong>{u.qcPassRate.toFixed(1)}%</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => setEditingStaff(u)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => {
                            setCurrentSessionUser(u);
                            router.push(
                              u.accessTier === "superadmin"
                                ? "/superadmin"
                                : "/dashboard"
                            );
                          }}
                        >
                          View As ↗
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            style={{ color: "#9e2a2b" }}
                            onClick={() => setDeletingStaff(u)}
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

          {/* 3. MULTI-FACILITY FACTORY PERFORMANCE & CRUD MATRIX */}
          {(activeSection === "overview" || activeSection === "facilities") && (
        <div className="workspace-panel" style={{ marginBottom: 24 }}>
          <div className="panel-header-row">
            <div>
              <h3>
                Multi-Facility Factory Branch CRUD ({branches.length} Production
                Locations)
              </h3>
              <p>
                Create, edit, inspect, or decommission production facilities,
                industrial sewing capacity, fabric stock, and branch P&amp;L.
              </p>
            </div>
            <button
              type="button"
              className="button button-dark"
              style={{ minHeight: 42 }}
              onClick={() => setBranchModalOpen(true)}
            >
              + Provision Factory Facility
            </button>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="superadmin-facilities-caption"
            className="table-wrapper"
          >
            <table
              className="size-chart responsive-data-table"
              style={
                {
                  "--label-1": "Facility Branch",
                  "--label-2": "Location & Focus",
                  "--label-3": "Machines & Staff",
                  "--label-4": "Fabric Stock",
                  "--label-5": "Net Revenue",
                  "--label-6": "True Net Profit",
                  "--label-7": "CRUD Actions",
                } as React.CSSProperties
              }
            >
              <caption id="superadmin-facilities-caption" className="sr-only">
                Multi-facility factory branch performance and capacity matrix
              </caption>
              <thead>
                <tr>
                  <th>Facility Branch</th>
                  <th>Location &amp; Focus</th>
                  <th>Machines &amp; Staff</th>
                  <th>Fabric Stock</th>
                  <th>Net Revenue</th>
                  <th>True Net Profit</th>
                  <th>CRUD Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((br) => {
                  const staffHere = artisans.filter(
                    (a) => a.branchId === br.id
                  ).length;
                  return (
                    <tr key={br.id}>
                      <th>
                        <div>{br.name}</div>
                        <span
                          className="mkp-badge mkp-badge-olive"
                          style={{ marginTop: 4 }}
                        >
                          {br.status}
                        </span>
                      </th>
                      <td>
                        <div style={{ fontWeight: 600 }}>{br.location}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {br.specialization}
                        </div>
                      </td>
                      <td className="mono">
                        <strong>{br.machineCount} machines</strong> ·{" "}
                        {staffHere} specialists
                      </td>
                      <td className="mono">
                        {br.fabricMetersStock.toLocaleString()} meters
                      </td>
                      <td className="mono">
                        <strong>₦{br.netRevenueNgn.toLocaleString()}</strong>
                      </td>
                      <td className="mono" style={{ color: "var(--ink)" }}>
                        <strong>₦{br.trueNetProfitNgn.toLocaleString()}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => handleInspectBranch(br.id)}
                          >
                            Inspect ⊞
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setEditingBranch(br)}
                          >
                            Edit
                          </button>
                          {branches.length > 1 && (
                            <button
                              type="button"
                              className="mkp-inline-btn"
                              style={{ color: "#9e2a2b" }}
                              onClick={() => setDeletingBranch(br)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
          )}

          {/* 4. RECENT SECURITY & GOVERNANCE AUDIT LOGS */}
          {(activeSection === "overview" || activeSection === "audit") && (
        <div className="workspace-panel">
          <div className="panel-header-row">
            <div>
              <h3>Global Security, RBAC &amp; QC Audit Trail</h3>
              <p>
                Immutable ledger of Superadmin/Admin CRUD operations, role
                promotions, facility provisioning, and QC floor sign-offs.
              </p>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Global security audit log"
            className="table-wrapper"
          >
            <table
              className="size-chart responsive-data-table"
              style={
                {
                  "--label-1": "Timestamp",
                  "--label-2": "Event Action",
                  "--label-3": "Actor & Role",
                  "--label-4": "Target Ref",
                  "--label-5": "Summary",
                } as React.CSSProperties
              }
            >
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Action</th>
                  <th>Actor &amp; Role</th>
                  <th>Target Ref</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>
                      No governance or QC audit log events recorded yet in this session.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 10).map((log) => (
                    <tr key={log.id}>
                      <th className="mono" style={{ fontSize: 11 }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </th>
                      <td className="mono">
                        <strong>{log.action}</strong>
                      </td>
                      <td>
                        <strong>{log.actor}</strong> ({log.role})
                      </td>
                      <td className="mono">{log.targetRef}</td>
                      <td>{log.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          )}
        </section>
      </div>

      {/* CREATE SUPERADMIN / ADMIN / STAFF MODAL */}
      <ModalDialog
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title="Provision Clerk RBAC Account (Superadmin, Admin or Staff)"
        maxWidth={580}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleCreateStaff}
        >
          <div className="form-row">
            <label>
              Access Tier (RBAC) *
              <select
                name="accessTier"
                value={newStaff.accessTier}
                onChange={(e) =>
                  setNewStaff((p) => ({
                    ...p,
                    accessTier: e.target.value as UserAccessTier,
                  }))
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
                name="role"
                value={newStaff.role}
                onChange={(e) =>
                  setNewStaff((p) => ({
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
              autoComplete="name"
              placeholder="e.g. Adebayo Adeleke"
              value={newStaff.name}
              onChange={(e) =>
                setNewStaff((p) => ({ ...p, name: e.target.value }))
              }
            />
          </label>
          <div className="form-row">
            <label>
              Work Email Address (Clerk Identity) *
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="admin@misskudi.com"
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, email: e.target.value }))
                }
              />
            </label>
            <label>
              Optional Clerk Password (8+ chars)
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Optional live Clerk password"
                value={newStaff.password}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, password: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Assigned Facility Branch *
              <select
                name="branchId"
                value={newStaff.branchId}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, branchId: e.target.value }))
                }
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Station / Executive Office *
              <input
                name="station"
                required
                placeholder="e.g. Executive HQ · Lagos"
                value={newStaff.station}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, station: e.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Technical Specialty &amp; Governance Scope
            <input
              name="specialty"
              placeholder="e.g. Multi-Facility Operations, CAD Pattern Grading, or AQL 2.5 QC"
              value={newStaff.specialty}
              onChange={(e) =>
                setNewStaff((p) => ({ ...p, specialty: e.target.value }))
              }
            />
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="submit"
              className="button button-dark"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? "Provisioning..." : "Provision Account"}
            </button>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => setStaffModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT SUPERADMIN / ADMIN / STAFF MODAL */}
      <ModalDialog
        open={Boolean(editingStaff)}
        onClose={() => {
          setEditStaffPassword("");
          setEditingStaff(null);
        }}
        title={`Edit Account — ${editingStaff?.name || ""}`}
        maxWidth={580}
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
                  <option value="superadmin">Superadmin (Global HQ)</option>
                  <option value="admin">Admin (Factory Plant Manager)</option>
                  <option value="staff">Staff (Artisan / Specialist)</option>
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
                Assigned Facility Branch *
                <select
                  name="branchId"
                  value={editingStaff.branchId}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      branchId: e.target.value,
                    })
                  }
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
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
            </div>
            <label>
              Technical Specialty
              <input
                name="specialty"
                value={editingStaff.specialty}
                onChange={(e) =>
                  setEditingStaff({
                    ...editingStaff,
                    specialty: e.target.value,
                  })
                }
              />
            </label>
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
                AQL 2.5 QC Pass Rate (%)
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
            <div className="form-row">
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
              <label>
                Floor Assignment Status
                <select
                  name="status"
                  value={editingStaff.status}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      status: e.target.value as ArtisanStaff["status"],
                    })
                  }
                >
                  <option value="Executive HQ">Executive HQ</option>
                  <option value="Active on Floor">Active on Floor</option>
                  <option value="Pattern Studio">Pattern Studio</option>
                  <option value="QC Station">QC Station</option>
                </select>
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
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Account Changes"}
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

      {/* DELETE SUPERADMIN / ADMIN / STAFF CONFIRMATION MODAL */}
      <ModalDialog
        open={Boolean(deletingStaff)}
        onClose={() => setDeletingStaff(null)}
        title="Confirm Account Deletion"
        maxWidth={480}
      >
        {deletingStaff && (
          <div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              Are you sure you want to permanently revoke and delete the{" "}
              <strong>{deletingStaff.accessTier.toUpperCase()}</strong> account
              for <strong>{deletingStaff.name}</strong> (
              <code>{deletingStaff.email}</code>)?
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="button button-dark"
                style={{ flex: 1, background: "#9e2a2b", borderColor: "#9e2a2b" }}
                onClick={handleConfirmDeleteStaff}
              >
                Confirm Delete Account
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => setDeletingStaff(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* PROVISION NEW FACTORY FACILITY MODAL */}
      <ModalDialog
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title="Provision New Garment Factory Facility"
        maxWidth={540}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleProvisionBranch}
        >
          <label>
            Facility / Atelier Name *
            <input
              name="name"
              required
              placeholder="e.g. Surulere Knitwear & Activewear Plant"
              value={newBranch.name}
              onChange={(e) =>
                setNewBranch((p) => ({ ...p, name: e.target.value }))
              }
            />
          </label>
          <label>
            Location / Street Address *
            <input
              name="location"
              required
              placeholder="e.g. 1 Alawode Street, Lagos, Nigeria"
              value={newBranch.location}
              onChange={(e) =>
                setNewBranch((p) => ({ ...p, location: e.target.value }))
              }
            />
          </label>
          <label>
            Production Specialization *
            <input
              name="specialization"
              required
              value={newBranch.specialization}
              onChange={(e) =>
                setNewBranch((p) => ({ ...p, specialization: e.target.value }))
              }
            />
          </label>
          <div className="form-row">
            <label>
              Industrial Machine Count
              <input
                name="machineCount"
                type="number"
                min={4}
                value={newBranch.machineCount}
                onChange={(e) =>
                  setNewBranch((p) => ({
                    ...p,
                    machineCount: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Initial Fabric Roll Stock (Meters)
              <input
                name="fabricMetersStock"
                type="number"
                min={0}
                value={newBranch.fabricMetersStock}
                onChange={(e) =>
                  setNewBranch((p) => ({
                    ...p,
                    fabricMetersStock: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="submit"
              className="button button-dark"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? "Provisioning..." : "Provision Facility"}
            </button>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={() => setBranchModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT FACILITY MODAL */}
      <ModalDialog
        open={Boolean(editingBranch)}
        onClose={() => setEditingBranch(null)}
        title={`Edit Facility — ${editingBranch?.name || ""}`}
        maxWidth={560}
      >
        {editingBranch && (
          <form
            className="quote-form"
            style={{ padding: 0, boxShadow: "none", border: "none" }}
            onSubmit={handleSaveBranchEdit}
          >
            <label>
              Facility Name *
              <input
                name="name"
                required
                value={editingBranch.name}
                onChange={(e) =>
                  setEditingBranch({ ...editingBranch, name: e.target.value })
                }
              />
            </label>
            <label>
              Location / Address *
              <input
                name="location"
                required
                value={editingBranch.location}
                onChange={(e) =>
                  setEditingBranch({
                    ...editingBranch,
                    location: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Specialization
              <input
                name="specialization"
                value={editingBranch.specialization}
                onChange={(e) =>
                  setEditingBranch({
                    ...editingBranch,
                    specialization: e.target.value,
                  })
                }
              />
            </label>
            <div className="form-row">
              <label>
                Industrial Machine Count
                <input
                  name="machineCount"
                  type="number"
                  min={1}
                  value={editingBranch.machineCount}
                  onChange={(e) =>
                    setEditingBranch({
                      ...editingBranch,
                      machineCount: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Fabric Stock (Meters)
                <input
                  name="fabricMetersStock"
                  type="number"
                  min={0}
                  value={editingBranch.fabricMetersStock}
                  onChange={(e) =>
                    setEditingBranch({
                      ...editingBranch,
                      fabricMetersStock: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Net Revenue (NGN ₦)
                <input
                  name="netRevenueNgn"
                  type="number"
                  min={0}
                  value={editingBranch.netRevenueNgn}
                  onChange={(e) =>
                    setEditingBranch({
                      ...editingBranch,
                      netRevenueNgn: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                True Net Profit (NGN ₦)
                <input
                  name="trueNetProfitNgn"
                  type="number"
                  value={editingBranch.trueNetProfitNgn}
                  onChange={(e) =>
                    setEditingBranch({
                      ...editingBranch,
                      trueNetProfitNgn: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              Operational Status
              <select
                name="status"
                value={editingBranch.status}
                onChange={(e) =>
                  setEditingBranch({
                    ...editingBranch,
                    status: e.target.value as FactoryBranch["status"],
                  })
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="submit"
                className="button button-dark"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                Save Facility Changes
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => setEditingBranch(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* DELETE FACILITY CONFIRMATION MODAL */}
      <ModalDialog
        open={Boolean(deletingBranch)}
        onClose={() => setDeletingBranch(null)}
        title="Confirm Facility Deletion"
        maxWidth={480}
      >
        {deletingBranch && (
          <div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              Are you sure you want to delete{" "}
              <strong>{deletingBranch.name}</strong> ({deletingBranch.location})?
              Any specialists assigned to this facility will be automatically
              reassigned to your flagship plant.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="button button-dark"
                style={{ flex: 1, background: "#9e2a2b", borderColor: "#9e2a2b" }}
                onClick={handleConfirmDeleteBranch}
              >
                Confirm Delete Facility
              </button>
              <button
                type="button"
                className="button button-light"
                style={{ border: "1px solid var(--line)" }}
                onClick={() => setDeletingBranch(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </main>
  );
}
