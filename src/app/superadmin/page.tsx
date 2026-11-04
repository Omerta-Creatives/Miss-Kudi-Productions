"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  appendAuditLog,
  ARTISAN_ROLE_LABELS,
  ArtisanRole,
  ArtisanStaff,
  AuditLogEntry,
  clearCurrentSessionUser,
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

type SuperadminSection = "overview" | "accounts" | "facilities" | "audit";

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
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [activeSection, setActiveSection] =
    useState<SuperadminSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Modals for Facility Branch Management
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<FactoryBranch | null>(
    null
  );
  const [deletingBranch, setDeletingBranch] = useState<FactoryBranch | null>(
    null
  );

  // Modals for Team & Access Management
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
    branchId: "BR-LOS-YABA",
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
      branchId: branches[0]?.id || "BR-LOS-YABA",
      station: defaultStation,
      specialty: defaultSpecialty,
      shiftStatus: "CLOCKED_IN",
    });
    setStaffModalOpen(true);
  };

  // --- FACILITY BRANCH MANAGEMENT ---
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
        summary: `Added factory facility "${created.name}" (${created.location}) with ${created.machineCount} industrial machines.`,
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
      showNotice(`Added facility "${created.name}".`);
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
      `Removed facility "${deletingBranch.name}". Staff reassigned to ${fallbackBranch.name}.`
    );
    setDeletingBranch(null);
  };

  const handleInspectBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    router.push("/dashboard");
  };

  // --- TEAM & ACCESS MANAGEMENT ---
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
        showNotice("Cannot demote the last remaining Superadmin account.");
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
        `Updated ${target.name} (${target.accessTier.toUpperCase()} · ${
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
        `Created ${created.accessTier.toUpperCase()} account for ${created.name}.`
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
        `Saved updates for ${updatedRecord.name}${
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
    showNotice(`Removed account for ${deletingStaff.name}.`);
    setDeletingStaff(null);
  };

  // Guard if non-superadmin visits /superadmin
  if (!isSuperAdminUser(currentUser)) {
    return (
      <main className="section-wrap" style={{ paddingBlock: 72 }}>
        <div
          className="workspace-panel"
          style={{ maxWidth: 580, marginInline: "auto" }}
        >
          <span className="mkp-badge mkp-badge-critical">
            SUPERADMIN CLEARANCE REQUIRED
          </span>
          <h2 style={{ marginTop: 12, fontSize: 26 }}>
            Restricted Executive HQ Console
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
            You are signed in as <strong>{currentUser.name}</strong> (
            <code>{currentUser.accessTier.toUpperCase()}</code> ·{" "}
            {ARTISAN_ROLE_LABELS[currentUser.role]}). Only{" "}
            <strong>Superadmin</strong> accounts can manage facilities or global
            access permissions.
          </p>
          <div
            style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}
          >
            <Link className="button button-dark" href="/dashboard">
              Return to Plant Console <span>→</span>
            </Link>
            <button
              type="button"
              className="button button-light"
              style={{ border: "1px solid var(--line)" }}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
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

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.targetRef.toLowerCase().includes(q) ||
      log.summary.toLowerCase().includes(q)
    );
  });

  const userInitials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sectionHeadingMeta: Record<
    SuperadminSection,
    { title: string; subtitle: string }
  > = {
    overview: {
      title: "Executive Summary",
      subtitle: `Consolidated operations across ${branches.length} Lagos facilities and ${artisans.length} authorized accounts`,
    },
    accounts: {
      title: "Team & Access",
      subtitle: `Provision and manage Superadmin, Plant Admin, and Floor Specialist permissions`,
    },
    facilities: {
      title: "Lagos Facilities",
      subtitle: `Production plants, machine capacity, fabric stock, and branch profitability`,
    },
    audit: {
      title: "Security & Audit Log",
      subtitle: `Immutable record of role updates, facility changes, and floor quality sign-offs`,
    },
  };

  return (
    <main>
      <div
        className={`dashboard-shell ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        {/* CALM SUPERADMIN SIDEBAR */}
        <aside
          className="dashboard-sidebar"
          aria-label="Superadmin HQ Navigation"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
              <div className="sidebar-identity-status">
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

            {/* Clean 4-Item HQ Modules */}
            <nav aria-label="Superadmin HQ Modules">
              <div className="sidebar-section-label">EXECUTIVE HQ</div>
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
                      <span>Executive Summary</span>
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${
                      activeSection === "accounts" ? "active" : ""
                    }`}
                    onClick={() => setActiveSection("accounts")}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon" aria-hidden="true">
                        ⊞
                      </span>
                      <span>Team &amp; Access</span>
                    </span>
                    <span className="sidebar-nav-badge">{artisans.length}</span>
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
                      <span>Facilities</span>
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
                      <span>Audit Log</span>
                    </span>
                    <span className="sidebar-nav-badge">{auditLogs.length}</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Clean Session & Account Footer */}
          <div className="sidebar-footer-card">
            <div className="sidebar-section-label" style={{ marginTop: 0 }}>
              SESSION
            </div>
            <Link className="sidebar-quick-btn" href="/dashboard">
              <span>Plant Console</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              className="sidebar-quick-btn"
              href="/login?mode=change-password"
            >
              <span>Change Password</span>
              <span aria-hidden="true">⚙</span>
            </Link>
            <button
              type="button"
              className="sidebar-quick-btn sidebar-signout-btn"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
              <span aria-hidden="true">⇥</span>
            </button>
          </div>
        </aside>

        {/* MAIN SUPERADMIN WORKSPACE */}
        <section className="dashboard-main">
          {/* Single Calm Page Header */}
          <header className="dashboard-page-header">
            <div className="dashboard-page-header-left">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
              >
                <span aria-hidden="true">☰</span>
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
              {activeSection === "facilities" ? (
                <button
                  type="button"
                  className="button button-dark"
                  style={{ minHeight: 40 }}
                  onClick={() => setBranchModalOpen(true)}
                >
                  + Add Facility
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-dark"
                  style={{ minHeight: 40 }}
                  onClick={() => openCreateAccountModal("admin")}
                >
                  + Add Account
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

          {/* ==================== VIEW 1: CALM EXECUTIVE SUMMARY ==================== */}
          {activeSection === "overview" && (
            <>
              <div className="kpi-grid-4">
                <div className="kpi-card">
                  <span className="ticket-label">GLOBAL PIPELINE GMV</span>
                  <div className="kpi-value mono">
                    ₦{globalGmv.toLocaleString()}
                  </div>
                  <div className="kpi-sub">
                    {ordersCount} active runs across {branches.length} plants
                  </div>
                </div>

                <div className="kpi-card">
                  <span className="ticket-label">OPERATING NET PROFIT</span>
                  <div
                    className="kpi-value mono"
                    style={{ color: "var(--ink)" }}
                  >
                    ₦{globalTrueNetProfit.toLocaleString()}
                  </div>
                  <div className="kpi-sub">
                    COGS ₦{estimatedCogs.toLocaleString()} · OpEx ₦
                    {globalOpEx.toLocaleString()}
                  </div>
                </div>

                <div className="kpi-card">
                  <span className="ticket-label">ACTIVE FACILITIES</span>
                  <div className="kpi-value mono">
                    {branches.length} Plants
                  </div>
                  <div className="kpi-sub">
                    {totalMachines} industrial machines installed
                  </div>
                </div>

                <div className="kpi-card">
                  <span className="ticket-label">AUTHORIZED TEAM</span>
                  <div className="kpi-value mono">{artisans.length} Users</div>
                  <div className="kpi-sub">
                    {superadminCount} HQ · {adminCount} Admin · {staffCount}{" "}
                    Staff
                  </div>
                </div>
              </div>

              {/* Lagos Facilities Snapshot Cards */}
              <div className="workspace-panel" style={{ marginBottom: 24 }}>
                <div className="panel-header-row">
                  <div>
                    <h3>Lagos Production Facilities</h3>
                    <p>
                      Select any plant to open its floor console or adjust
                      machine capacity.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mkp-inline-btn"
                    onClick={() => setActiveSection("facilities")}
                  >
                    Manage facilities ({branches.length}) →
                  </button>
                </div>

                <div className="facility-snapshot-grid">
                  {branches.map((br) => {
                    const staffHere = artisans.filter(
                      (a) => a.branchId === br.id
                    ).length;
                    return (
                      <div key={br.id} className="facility-snapshot-card">
                        <div className="facility-snapshot-head">
                          <div>
                            <h4>{br.name}</h4>
                            <p>{br.location}</p>
                          </div>
                          <span className="mkp-badge mkp-badge-olive">
                            {br.status}
                          </span>
                        </div>
                        <div className="facility-snapshot-spec">
                          {br.specialization}
                        </div>
                        <div className="facility-snapshot-metrics mono">
                          <span>{br.machineCount} machines</span>
                          <span>{staffHere} team</span>
                          <span>
                            ₦{br.netRevenueNgn.toLocaleString()} rev
                          </span>
                        </div>
                        <div className="facility-snapshot-actions">
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => handleInspectBranch(br.id)}
                          >
                            Open Plant Console →
                          </button>
                          <button
                            type="button"
                            className="mkp-inline-btn"
                            onClick={() => setEditingBranch(br)}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2-Card Governance Snapshot: Team Tiers + Recent Audit Log */}
              <div className="overview-summary-grid">
                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div>
                      <h3>Team &amp; Access Tiers</h3>
                      <p>
                        Role distribution across Executive HQ, Plant Admins, and
                        Floor Specialists.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mkp-inline-btn"
                      onClick={() => {
                        setTierFilter("all");
                        setActiveSection("accounts");
                      }}
                    >
                      View all ({artisans.length}) →
                    </button>
                  </div>

                  <div className="summary-list">
                    <div className="summary-list-row">
                      <div className="summary-list-primary">
                        <div className="summary-row-title">
                          <strong>Superadmin HQ</strong>
                          <span className="mkp-badge mkp-badge-olive">
                            {superadminCount}
                          </span>
                        </div>
                        <div className="summary-row-sub">
                          Global facility provisioning, P&amp;L, and role
                          governance
                        </div>
                      </div>
                      <div className="summary-list-actions">
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => {
                            setTierFilter("superadmin");
                            setActiveSection("accounts");
                          }}
                        >
                          Filter →
                        </button>
                      </div>
                    </div>

                    <div className="summary-list-row">
                      <div className="summary-list-primary">
                        <div className="summary-row-title">
                          <strong>Plant Admins</strong>
                          <span className="size-pill-item">{adminCount}</span>
                        </div>
                        <div className="summary-row-sub">
                          Branch orders, merchandising, and stock management
                        </div>
                      </div>
                      <div className="summary-list-actions">
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => {
                            setTierFilter("admin");
                            setActiveSection("accounts");
                          }}
                        >
                          Filter →
                        </button>
                      </div>
                    </div>

                    <div className="summary-list-row">
                      <div className="summary-list-primary">
                        <div className="summary-row-title">
                          <strong>Floor Specialists</strong>
                          <span className="size-pill-item">{staffCount}</span>
                        </div>
                        <div className="summary-row-sub">
                          Pattern grading, cutting, sewing lines, and AQL 2.5 QC
                        </div>
                      </div>
                      <div className="summary-list-actions">
                        <button
                          type="button"
                          className="mkp-inline-btn"
                          onClick={() => {
                            setTierFilter("staff");
                            setActiveSection("accounts");
                          }}
                        >
                          Filter →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="workspace-panel">
                  <div className="panel-header-row">
                    <div>
                      <h3>Recent Audit Activity</h3>
                      <p>Latest security, role, and facility events.</p>
                    </div>
                    <button
                      type="button"
                      className="mkp-inline-btn"
                      onClick={() => setActiveSection("audit")}
                    >
                      Full log ({auditLogs.length}) →
                    </button>
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="console-empty-state">
                      <p>No audit events recorded yet in this session.</p>
                    </div>
                  ) : (
                    <div className="summary-list">
                      {auditLogs.slice(0, 4).map((log) => (
                        <div key={log.id} className="summary-list-row">
                          <div className="summary-list-primary">
                            <div className="summary-row-title">
                              <span className="mono">{log.action}</span>
                              <strong>{log.actor}</strong>
                            </div>
                            <div className="summary-row-sub">{log.summary}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ==================== VIEW 2: FULL-WIDTH TEAM & ACCESS ==================== */}
          {activeSection === "accounts" && (
            <div className="workspace-panel">
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
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="mkp-inline-btn"
                    style={
                      tierFilter === "all"
                        ? { background: "var(--ink)", color: "#fff" }
                        : undefined
                    }
                    onClick={() => setTierFilter("all")}
                  >
                    All ({artisans.length})
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
                    Superadmins ({superadminCount})
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
                    Plant Admins ({adminCount})
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
                    Floor Specialists ({staffCount})
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
                    <option value="all">
                      All Facilities ({branches.length})
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
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
                      "--label-1": "Member",
                      "--label-2": "Access Tier",
                      "--label-3": "Role",
                      "--label-4": "Assigned Facility",
                      "--label-5": "Station & Shift",
                      "--label-6": "Actions",
                    } as React.CSSProperties
                  }
                >
                  <caption id="superadmin-rbac-caption" className="sr-only">
                    Authorized Superadmin, Plant Admin, and Staff accounts
                  </caption>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Access Tier</th>
                      <th>Role</th>
                      <th>Assigned Facility</th>
                      <th>Station &amp; Shift</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArtisans.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: 24,
                            color: "var(--muted)",
                          }}
                        >
                          No accounts match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredArtisans.map((u) => (
                        <tr key={u.id}>
                          <th>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span>{u.name}</span>
                              {u.accessTier === "superadmin" && (
                                <span className="mkp-badge mkp-badge-olive">
                                  HQ ★
                                </span>
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
                              <option value="superadmin">
                                SUPERADMIN (HQ)
                              </option>
                              <option value="admin">
                                ADMIN (Plant Manager)
                              </option>
                              <option value="staff">
                                STAFF (Artisan Floor)
                              </option>
                            </select>
                          </td>
                          <td>
                            <select
                              aria-label={`Role for ${u.name}`}
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
                              <option value="cutting_master">
                                Cutting Master
                              </option>
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
                              {u.shiftStatus === "CLOCKED_IN"
                                ? "● Clocked In"
                                : "○ Off Shift"}{" "}
                              · {u.qcPassRate.toFixed(1)}% QC
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
                                onClick={() => setEditingStaff(u)}
                              >
                                Edit
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== VIEW 3: FULL-WIDTH FACILITIES ==================== */}
          {activeSection === "facilities" && (
            <div className="workspace-panel">
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
                      "--label-1": "Facility",
                      "--label-2": "Location & Focus",
                      "--label-3": "Capacity & Team",
                      "--label-4": "Fabric Stock",
                      "--label-5": "Net Revenue",
                      "--label-6": "Operating Profit",
                      "--label-7": "Actions",
                    } as React.CSSProperties
                  }
                >
                  <caption
                    id="superadmin-facilities-caption"
                    className="sr-only"
                  >
                    Lagos production facilities capacity and financial summary
                  </caption>
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Location &amp; Focus</th>
                      <th>Capacity &amp; Team</th>
                      <th>Fabric Stock</th>
                      <th>Net Revenue</th>
                      <th>Operating Profit</th>
                      <th>Actions</th>
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
                            <div
                              style={{ fontSize: 11, color: "var(--muted)" }}
                            >
                              {br.specialization}
                            </div>
                          </td>
                          <td className="mono">
                            <strong>{br.machineCount} machines</strong> ·{" "}
                            {staffHere} members
                          </td>
                          <td className="mono">
                            {br.fabricMetersStock.toLocaleString()} meters
                          </td>
                          <td className="mono">
                            <strong>₦{br.netRevenueNgn.toLocaleString()}</strong>
                          </td>
                          <td className="mono" style={{ color: "var(--ink)" }}>
                            <strong>
                              ₦{br.trueNetProfitNgn.toLocaleString()}
                            </strong>
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
                                onClick={() => handleInspectBranch(br.id)}
                              >
                                Inspect →
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

          {/* ==================== VIEW 4: FULL-WIDTH AUDIT LOG ==================== */}
          {activeSection === "audit" && (
            <div className="workspace-panel">
              <div className="panel-header-row">
                <div className="panel-filter-bar">
                  <input
                    type="search"
                    aria-label="Search audit log"
                    placeholder="Filter by action, actor, or summary..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="table-select"
                    style={{ minWidth: 260 }}
                  />
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--muted)" }}
                  >
                    {filteredAuditLogs.length} event(s)
                  </span>
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
                      "--label-4": "Target",
                      "--label-5": "Summary",
                    } as React.CSSProperties
                  }
                >
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event Action</th>
                      <th>Actor &amp; Role</th>
                      <th>Target</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: 24,
                            color: "var(--muted)",
                          }}
                        >
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
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

      {/* CREATE ACCOUNT MODAL */}
      <ModalDialog
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title="Add Authorized Account"
        maxWidth={580}
      >
        <form
          className="quote-form"
          style={{ padding: 0, boxShadow: "none", border: "none" }}
          onSubmit={handleCreateStaff}
        >
          <div className="form-row">
            <label>
              Access Tier *
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
                <option value="admin">Admin (Plant Manager)</option>
                <option value="staff">Staff (Artisan / Specialist)</option>
              </select>
            </label>
            <label>
              Role *
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
              Work Email Address *
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
              Initial Password (8+ chars)
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Optional initial password"
                value={newStaff.password}
                onChange={(e) =>
                  setNewStaff((p) => ({ ...p, password: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Assigned Facility *
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
              Station / Office *
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
            Technical Specialty &amp; Scope
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
              {submitting ? "Saving..." : "Create Account"}
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

      {/* EDIT ACCOUNT MODAL */}
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
                Access Tier *
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
                  <option value="admin">Admin (Plant Manager)</option>
                  <option value="staff">Staff (Artisan / Specialist)</option>
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
                Assigned Facility *
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
                8+ characters — clears any failed-login lockout
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
                {submitting ? "Saving..." : "Save Changes"}
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

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <ModalDialog
        open={Boolean(deletingStaff)}
        onClose={() => setDeletingStaff(null)}
        title="Confirm Account Removal"
        maxWidth={480}
      >
        {deletingStaff && (
          <div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              Are you sure you want to permanently revoke and remove the{" "}
              <strong>{deletingStaff.accessTier.toUpperCase()}</strong> account
              for <strong>{deletingStaff.name}</strong> (
              <code>{deletingStaff.email}</code>)?
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="button button-dark"
                style={{
                  flex: 1,
                  background: "#9e2a2b",
                  borderColor: "#9e2a2b",
                }}
                onClick={handleConfirmDeleteStaff}
              >
                Confirm Remove
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

      {/* ADD NEW FACILITY MODAL */}
      <ModalDialog
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title="Add Garment Factory Facility"
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
              {submitting ? "Saving..." : "Add Facility"}
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
                Operating Profit (NGN ₦)
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
                Save Changes
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
        title="Confirm Facility Removal"
        maxWidth={480}
      >
        {deletingBranch && (
          <div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              Are you sure you want to remove{" "}
              <strong>{deletingBranch.name}</strong> ({deletingBranch.location})?
              Any team members assigned to this facility will be automatically
              reassigned to your flagship plant.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="button button-dark"
                style={{
                  flex: 1,
                  background: "#9e2a2b",
                  borderColor: "#9e2a2b",
                }}
                onClick={handleConfirmDeleteBranch}
              >
                Confirm Remove
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
