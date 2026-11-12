"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ARTISAN_ROLE_LABELS,
  ArtisanStaff,
  canManageFactory,
  FactoryBranch,
  isStaffUser,
  isSuperAdminUser,
} from "../lib/production-os";
import { UiIcon, UiIconName } from "./UiIcon";

export interface ConsoleSidebarNavItem {
  id: string;
  label: string;
  icon: UiIconName;
  badge?: number | string;
  active: boolean;
  onSelect: () => void;
}

interface ConsoleSidebarProps {
  user: ArtisanStaff;
  groupLabel: string;
  items: ConsoleSidebarNavItem[];
  branches?: FactoryBranch[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
  signingOut?: boolean;
}

export function ConsoleSidebar({
  user,
  groupLabel,
  items,
  branches,
  activeBranchId,
  onBranchChange,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onSignOut,
  signingOut = false,
}: ConsoleSidebarProps) {
  const pathname = usePathname();
  const isStaff = isStaffUser(user);
  const isSuper = isSuperAdminUser(user);
  const isManager = canManageFactory(user);

  const userInitials = (user.name || "MK")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleItemClick = (fn: () => void) => {
    fn();
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="console-sidebar-backdrop no-print"
          aria-hidden="true"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`dashboard-sidebar no-print ${
          collapsed ? "is-collapsed" : ""
        } ${mobileOpen ? "is-mobile-open" : ""}`}
        aria-label={`${groupLabel} Navigation`}
      >
        <div className="sidebar-top-stack">
          <div className="sidebar-mobile-bar">
            <span className="sidebar-section-label" style={{ marginBottom: 0 }}>
              Studio Navigation
            </span>
            <button
              type="button"
              className="mobile-drawer-close"
              aria-label="Close sidebar menu"
              onClick={onCloseMobile}
            >
              <UiIcon name="close" size={15} />
            </button>
          </div>

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

            <div className="sidebar-identity-status">
              <span className="mkp-badge mkp-badge-olive">
                {isSuper ? "Superadmin HQ" : ARTISAN_ROLE_LABELS[user.role]}
              </span>
              <span className="sidebar-shift-text">
                {user.shiftStatus === "CLOCKED_IN" ? "On shift" : "Off shift"}
              </span>
            </div>

            {!isStaff && branches && branches.length > 1 && onBranchChange ? (
              <label className="sidebar-facility-picker">
                <span>Active plant</span>
                <select
                  aria-label="Active Facility Branch"
                  className="table-select"
                  value={activeBranchId || branches[0]?.id || ""}
                  onChange={(e) => onBranchChange(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : !isStaff ? (
              <div className="sidebar-station-caption">
                Facility: <strong>1 Alawode St, Surulere</strong>
              </div>
            ) : (
              <div className="sidebar-station-caption">
                Station: <strong>{user.station}</strong>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <nav aria-label={groupLabel}>
              <div className="sidebar-section-label">{groupLabel}</div>
              <ul className="sidebar-nav-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${
                        item.active ? "active" : ""
                      }`}
                      onClick={() => handleItemClick(item.onSelect)}
                    >
                      <span className="sidebar-nav-btn-label">
                        <span className="sidebar-nav-icon">
                          <UiIcon name={item.icon} size={15} />
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span className="sidebar-nav-badge">{item.badge}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-label="Studio Suite">
            <div className="sidebar-section-label">Studio Suite</div>
            <ul className="sidebar-nav-list">
              {isSuper && (
                <li>
                  <Link
                    href="/superadmin"
                    className={`sidebar-nav-btn sidebar-nav-link ${
                      pathname === "/superadmin" ? "active" : ""
                    }`}
                    onClick={onCloseMobile}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon">
                        <UiIcon name="star" size={15} />
                      </span>
                      <span>Superadmin HQ</span>
                    </span>
                  </Link>
                </li>
              )}

              <li>
                <Link
                  href="/dashboard"
                  className={`sidebar-nav-btn sidebar-nav-link ${
                    pathname === "/dashboard" ? "active" : ""
                  }`}
                  onClick={onCloseMobile}
                >
                  <span className="sidebar-nav-btn-label">
                    <span className="sidebar-nav-icon">
                      <UiIcon name="grid" size={15} />
                    </span>
                    <span>{isStaff ? "My Station" : "Plant Console"}</span>
                  </span>
                </Link>
              </li>

              {isManager && (
                <li>
                  <Link
                    href="/workspace"
                    className={`sidebar-nav-btn sidebar-nav-link ${
                      pathname === "/workspace" ? "active" : ""
                    }`}
                    onClick={onCloseMobile}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon">
                        <UiIcon name="briefcase" size={15} />
                      </span>
                      <span>Operations &amp; P&amp;L</span>
                    </span>
                  </Link>
                </li>
              )}

              {isManager && pathname !== "/workspace" && pathname !== "/dashboard" && (
                <li>
                  <Link
                    href="/workspace?tab=invoicing"
                    className="sidebar-nav-btn sidebar-nav-link"
                    onClick={onCloseMobile}
                  >
                    <span className="sidebar-nav-btn-label">
                      <span className="sidebar-nav-icon">
                        <UiIcon name="receipt" size={15} />
                      </span>
                      <span>Invoicing &amp; Receipts</span>
                    </span>
                  </Link>
                </li>
              )}

              <li>
                <Link
                  href="/tracker"
                  className={`sidebar-nav-btn sidebar-nav-link ${
                    pathname === "/tracker" ? "active" : ""
                  }`}
                  onClick={onCloseMobile}
                >
                  <span className="sidebar-nav-btn-label">
                    <span className="sidebar-nav-icon">
                      <UiIcon name="compass" size={15} />
                    </span>
                    <span>Order Tracker</span>
                  </span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer-card">
          <div className="sidebar-section-label">Session</div>
          <Link
            className="sidebar-quick-btn"
            href="/"
            onClick={onCloseMobile}
          >
            <span>Public Website</span>
            <UiIcon name="globe" size={14} />
          </Link>
          <Link
            className="sidebar-quick-btn"
            href="/login?mode=change-password"
            onClick={onCloseMobile}
          >
            <span>Change Password</span>
            <UiIcon name="lock" size={14} />
          </Link>
          <button
            type="button"
            className="sidebar-quick-btn sidebar-signout-btn"
            onClick={onSignOut}
            disabled={signingOut}
          >
            <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
            <UiIcon name="logout" size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}
