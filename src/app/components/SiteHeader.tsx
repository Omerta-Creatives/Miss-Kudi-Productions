"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ACCESS_TIER_LABELS,
  ARTISAN_ROLE_LABELS,
  ArtisanStaff,
  canManageFactory,
  clearCurrentSessionUser,
  ClientSessionMeta,
  FactoryBranch,
  getActiveBranchId,
  getCurrentSessionMeta,
  getCurrentSessionUser,
  INITIAL_ARTISANS,
  INITIAL_BRANCHES,
  isSessionAuthenticated,
  isSuperAdminUser,
  loadArtisans,
  loadBranches,
  setActiveBranchId,
  setCurrentSessionUser,
} from "../lib/production-os";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerTitleId = useId();

  const [authenticated, setAuthenticated] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<ClientSessionMeta | null>(null);
  const [canImpersonate, setCanImpersonate] = useState(false);
  const [user, setUser] = useState<ArtisanStaff>(INITIAL_ARTISANS[0]);
  const [artisans, setArtisans] = useState<ArtisanStaff[]>(INITIAL_ARTISANS);
  const [branches, setBranches] = useState<FactoryBranch[]>(INITIAL_BRANCHES);
  const [activeBranchId, setBranchState] = useState<string>(
    INITIAL_BRANCHES[0].id
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Strict boundary: Internal in-house portals vs. Public marketing/client pages
  const isInternalRoute =
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/tracker") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password");

  useEffect(() => {
    const syncState = () => {
      const authed = isSessionAuthenticated();
      setAuthenticated(authed);
      setSessionMeta(getCurrentSessionMeta());
      setArtisans(loadArtisans());
      setBranches(loadBranches());
      const current = getCurrentSessionUser();
      setUser(current);
      if (authed && current.accessTier === "superadmin") {
        setCanImpersonate(true);
      } else if (!authed) {
        setCanImpersonate(false);
      }
      setBranchState(getActiveBranchId());
    };
    syncState();

    // Sync authoritative server HttpOnly session cookie
    if (isInternalRoute) {
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((data) => {
          if (data?.authenticated && data.user) {
            setAuthenticated(true);
            setUser(data.user);
            if (data.user.accessTier === "superadmin") {
              setCanImpersonate(true);
            }
            const meta: ClientSessionMeta = {
              authenticated: true,
              rememberMe: Boolean(data.session?.rememberMe),
              expiresAt: data.session?.expiresAt || "",
              signedInAt: data.session?.issuedAt || new Date().toISOString(),
              sessionId: data.session?.sessionId,
            };
            setSessionMeta(meta);
            setCurrentSessionUser(data.user, {
              rememberMe: meta.rememberMe,
              expiresAt: meta.expiresAt,
              sessionId: meta.sessionId,
            });
          } else {
            setAuthenticated(false);
            setSessionMeta(null);
            setCanImpersonate(false);
          }
        })
        .catch(() => {});
    }

    window.addEventListener("mkp:session-change", syncState);
    window.addEventListener("mkp:branch-change", syncState);
    return () => {
      window.removeEventListener("mkp:session-change", syncState);
      window.removeEventListener("mkp:branch-change", syncState);
    };
  }, [pathname, isInternalRoute]);

  // modern-web-guidance: light-dismiss-a-dialog for mobile drawer
  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;

    if (drawerOpen && !dialog.open) {
      dialog.showModal();
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    const onClose = () => setDrawerOpen(false);
    dialog.addEventListener("close", onClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!inside) dialog.close();
      };
      dialog.addEventListener("click", handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener("close", onClose);
      if (handleBackdropClick) {
        dialog.removeEventListener("click", handleBackdropClick);
      }
    };
  }, []);

  const handleRoleSwitch = async (userId: string) => {
    const target = artisans.find((a) => a.id === userId);
    if (!target) return;

    // Security guard: Only Superadmin sessions can impersonate/switch stations without password
    if (!authenticated || !canImpersonate || user.accessTier !== "superadmin") {
      setDrawerOpen(false);
      router.push(`/login?email=${encodeURIComponent(target.email)}`);
      return;
    }

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUser: target }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        router.push(`/login?email=${encodeURIComponent(target.email)}`);
        return;
      }
      setCurrentSessionUser(target, {
        rememberMe: data.session?.rememberMe,
        expiresAt: data.session?.expiresAt,
        sessionId: data.session?.sessionId,
      });
      setUser(target);
      setBranchState(target.branchId);
      if (
        pathname.startsWith("/superadmin") &&
        target.accessTier !== "superadmin"
      ) {
        router.push("/dashboard");
      }
    } catch {
      router.push(`/login?email=${encodeURIComponent(target.email)}`);
    }
  };

  const handleBranchSwitch = (branchId: string) => {
    setActiveBranchId(branchId);
    setBranchState(branchId);
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
      setAuthenticated(false);
      setSessionMeta(null);
      setCanImpersonate(false);
      setSigningOut(false);
      setDrawerOpen(false);
      router.push("/login?signedOut=1");
      router.refresh();
    }
  };

  const isSuper = authenticated && isSuperAdminUser(user);
  const canManage = authenticated && canManageFactory(user);

  const publicNavLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/process", label: "Process" },
    { href: "/size-charts", label: "Size & Ratio" },
    { href: "/quote", label: "Quote" },
  ];

  const internalNavLinks = authenticated
    ? [
        ...(isSuper ? [{ href: "/superadmin", label: "★ Superadmin HQ" }] : []),
        {
          href: "/dashboard",
          label:
            user.accessTier === "staff"
              ? `My Station (${ARTISAN_ROLE_LABELS[user.role].split(" ")[0]})`
              : "Admin & Staff Console",
        },
        { href: "/workspace", label: "Operations Workspace" },
        { href: "/tracker", label: "Order Tracker" },
      ]
    : [
        { href: "/login", label: "Staff & Admin Sign-In" },
        { href: "/reset-password", label: "Reset Password" },
      ];

  const navLinks = isInternalRoute ? internalNavLinks : publicNavLinks;

  const internalPortalBadge = pathname.startsWith("/superadmin")
    ? "SUPERADMIN GLOBAL HQ"
    : pathname.startsWith("/workspace")
    ? "FACTORY OPERATIONS OS"
    : pathname.startsWith("/tracker")
    ? "IN-HOUSE ORDER TRACKER"
    : pathname.startsWith("/reset-password")
    ? "IDENTITY RECOVERY DESK"
    : pathname.startsWith("/login")
    ? "STAFF & ADMIN AUTHENTICATION"
    : "PLANT ADMIN & STAFF CONSOLE";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Internal RBAC Bar — Rendered STRICTLY on in-house staff/admin routes */}
      {isInternalRoute && (
        <div className="rbac-topbar no-print">
          <div className="rbac-topbar-inner">
            <div className="rbac-status-group">
              <span className="rbac-pill rbac-pill-ok">
                <span className="status-dot" />
                IN-HOUSE PRODUCTION OS
              </span>
              {authenticated ? (
                <>
                  <span className="rbac-pill rbac-pill-tier">
                    {user.name} · {user.accessTier.toUpperCase()} (
                    {ARTISAN_ROLE_LABELS[user.role]})
                  </span>
                  <span className="rbac-pill">
                    {sessionMeta?.rememberMe
                      ? "30D WORKSTATION"
                      : "8H FLOOR SHIFT"}
                  </span>
                </>
              ) : (
                <span className="rbac-pill rbac-pill-warn">
                  AUTHENTICATION REQUIRED · SIGN IN TO UNLOCK STATIONS
                </span>
              )}
            </div>

            <div className="rbac-controls-group">
              {authenticated && isSuper && (
                <label
                  className="rbac-select-label"
                  htmlFor="global-role-switcher"
                >
                  <span>Station Preview:</span>
                  <select
                    id="global-role-switcher"
                    className="rbac-select"
                    value={user.id}
                    onChange={(e) => handleRoleSwitch(e.target.value)}
                  >
                    <optgroup label="Superadmin (Global Executive HQ)">
                      {artisans
                        .filter((a) => a.accessTier === "superadmin")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            ★ {a.name} — Superadmin
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Admin (Plant & Atelier Managers)">
                      {artisans
                        .filter((a) => a.accessTier === "admin")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            ◆ {a.name} — Admin ({a.branchName.split(" ")[0]})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Staff (Pattern, Cutting, Tailors & QC)">
                      {artisans
                        .filter((a) => a.accessTier === "staff")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            • {a.name} — {ARTISAN_ROLE_LABELS[a.role]}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </label>
              )}

              {canManage && (
                <label
                  className="rbac-select-label"
                  htmlFor="global-branch-switcher"
                >
                  <span>Plant Scope:</span>
                  <select
                    id="global-branch-switcher"
                    className="rbac-select"
                    value={activeBranchId}
                    onChange={(e) => handleBranchSwitch(e.target.value)}
                  >
                    <option value="ALL">
                      All Lagos Facilities (Consolidated)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {authenticated ? (
                <>
                  <Link
                    href="/login?mode=change-password"
                    className="rbac-signin-link"
                  >
                    Password ⚙
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="rbac-signout-btn"
                  >
                    {signingOut ? "Signing out..." : "Sign Out →"}
                  </button>
                </>
              ) : (
                <Link href="/login" className="rbac-signin-link">
                  Sign In →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Header */}
      <header
        className={`site-header no-print ${
          isInternalRoute ? "site-header-internal" : ""
        }`}
      >
        <div className="header-brand-cluster">
          <Link
            href="/"
            className="wordmark"
            aria-label="Miss Kudi Productions Home"
          >
            <img
              src="/images/mk-logo-transparent.png"
              alt="Miss Kudi Productions — Lagos Atelier"
              width={64}
              height={64}
              className="wordmark-logo-img"
            />
          </Link>
          {isInternalRoute && (
            <div className="internal-header-context mono">
              <span className="internal-context-kicker">
                MISS KUDI PRODUCTIONS
              </span>
              <strong className="internal-context-title">
                {internalPortalBadge}
              </strong>
            </div>
          )}
        </div>

        <nav
          className={`desktop-nav ${
            isInternalRoute ? "internal-nav-pills" : ""
          }`}
          aria-label="Primary Navigation"
        >
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "active-nav-link" : ""}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions-group">
          <Link
            className={`button ${
              isInternalRoute
                ? "button-light internal-exit-btn"
                : "button-dark"
            } header-cta desktop-cta`}
            href={isInternalRoute ? "/" : "/quote"}
          >
            {isInternalRoute ? "Public Website" : "Request a Quote"}{" "}
            <span>↗</span>
          </Link>

          <button
            type="button"
            className="mobile-menu-trigger"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <span className="hamburger-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer (<dialog closedby="any">) */}
      <dialog
        id="mobile-navigation-drawer"
        ref={drawerRef}
        className="mobile-nav-drawer no-print"
        aria-labelledby={drawerTitleId}
        {...({
          closedby: "any",
        } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      >
        <div className="mobile-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/images/mk-logo-transparent.png"
              alt="Miss Kudi Productions"
              width={50}
              height={50}
              className="wordmark-logo-img"
              style={{ width: 50, height: 50 }}
            />
            <div
              id={drawerTitleId}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--muted)",
              }}
            >
              {isInternalRoute && authenticated
                ? ACCESS_TIER_LABELS[user.accessTier]
                : "LAGOS GARMENT MANUFACTURING"}
            </div>
          </div>
          <button
            type="button"
            className="mobile-drawer-close"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          >
            Close ✕
          </button>
        </div>

        {isInternalRoute && authenticated && (
          <div className="mobile-drawer-session-card">
            <div className="ticket-label">
              ACTIVE STAFF SESSION ·{" "}
              {sessionMeta?.rememberMe ? "30D WORKSTATION" : "8H SHIFT"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
              {user.name}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}
            >
              {ARTISAN_ROLE_LABELS[user.role]} · {user.branchName}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href="/login?mode=change-password"
                className="button button-light"
                style={{
                  flex: 1,
                  minHeight: 40,
                  fontSize: 11,
                  border: "1px solid var(--line)",
                }}
                onClick={() => setDrawerOpen(false)}
              >
                Change Password
              </Link>
              <button
                type="button"
                className="button button-dark"
                style={{ flex: 1, minHeight: 40, fontSize: 11 }}
                onClick={handleSignOut}
                disabled={signingOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        <nav className="mobile-drawer-links" aria-label="Mobile Navigation">
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-drawer-link ${active ? "active" : ""}`}
                onClick={() => setDrawerOpen(false)}
              >
                <span>{link.label}</span>
                <span>→</span>
              </Link>
            );
          })}
        </nav>

        <div className="mobile-drawer-footer">
          {isInternalRoute ? (
            authenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="button button-dark"
                  style={{ width: "100%" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Open Staff Dashboard <span>↗</span>
                </Link>
                <Link
                  href="/tracker"
                  className="button button-light"
                  style={{ width: "100%", border: "1px solid var(--line)" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Internal Order Tracker <span>⌖</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="button button-dark"
                  style={{ width: "100%" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Sign In to Operations OS <span>→</span>
                </Link>
                <Link
                  href="/reset-password"
                  className="button button-light"
                  style={{ width: "100%", border: "1px solid var(--line)" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Reset Factory Password <span>↺</span>
                </Link>
              </>
            )
          ) : (
            <>
              <Link
                href="/quote"
                className="button button-dark"
                style={{ width: "100%" }}
                onClick={() => setDrawerOpen(false)}
              >
                Request Production Quote <span>↗</span>
              </Link>
              <Link
                href="/size-charts"
                className="button button-light"
                style={{ width: "100%", border: "1px solid var(--line)" }}
                onClick={() => setDrawerOpen(false)}
              >
                Size &amp; Ratio Calculator <span>⊞</span>
              </Link>
            </>
          )}
        </div>
      </dialog>

      {/* Mobile Bottom Thumb-Zone Navigation Dock */}
      <nav
        className="mobile-bottom-dock no-print"
        aria-label="Quick Mobile Actions"
      >
        {isInternalRoute ? (
          authenticated ? (
            <>
              <Link
                href="/dashboard"
                className={`mobile-dock-item ${
                  pathname.startsWith("/dashboard") ? "active" : ""
                }`}
              >
                <span aria-hidden="true">⊞</span>
                <span>Station</span>
              </Link>
              <Link
                href="/workspace"
                className={`mobile-dock-item ${
                  pathname.startsWith("/workspace") ? "active" : ""
                }`}
              >
                <span aria-hidden="true">⚙</span>
                <span>Workspace</span>
              </Link>
              {isSuper && (
                <Link
                  href="/superadmin"
                  className={`mobile-dock-item ${
                    pathname.startsWith("/superadmin") ? "active" : ""
                  }`}
                >
                  <span aria-hidden="true">★</span>
                  <span>HQ</span>
                </Link>
              )}
              <Link
                href="/tracker"
                className={`mobile-dock-item ${
                  pathname.startsWith("/tracker") ? "active" : ""
                }`}
              >
                <span aria-hidden="true">⌖</span>
                <span>Tracker</span>
              </Link>
              <Link
                href="/login"
                className={`mobile-dock-item ${
                  pathname.startsWith("/login") ? "active" : ""
                }`}
              >
                <span aria-hidden="true">👤</span>
                <span>Account</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`mobile-dock-item ${
                  pathname.startsWith("/login") ? "active" : ""
                }`}
              >
                <span aria-hidden="true">🔐</span>
                <span>Sign In</span>
              </Link>
              <Link
                href="/reset-password"
                className={`mobile-dock-item ${
                  pathname.startsWith("/reset-password") ? "active" : ""
                }`}
              >
                <span aria-hidden="true">↺</span>
                <span>Reset</span>
              </Link>
              <Link href="/" className="mobile-dock-item">
                <span aria-hidden="true">⌂</span>
                <span>Public Site</span>
              </Link>
            </>
          )
        ) : (
          <>
            <Link
              href="/"
              className={`mobile-dock-item ${pathname === "/" ? "active" : ""}`}
            >
              <span aria-hidden="true">⌂</span>
              <span>Home</span>
            </Link>
            <Link
              href="/services"
              className={`mobile-dock-item ${
                pathname.startsWith("/services") ? "active" : ""
              }`}
            >
              <span aria-hidden="true">✦</span>
              <span>Services</span>
            </Link>
            <Link
              href="/process"
              className={`mobile-dock-item ${
                pathname.startsWith("/process") ? "active" : ""
              }`}
            >
              <span aria-hidden="true">◈</span>
              <span>Process</span>
            </Link>
            <Link
              href="/size-charts"
              className={`mobile-dock-item ${
                pathname.startsWith("/size-charts") ? "active" : ""
              }`}
            >
              <span aria-hidden="true">⊞</span>
              <span>Grading</span>
            </Link>
            <Link
              href="/quote"
              className={`mobile-dock-item ${
                pathname.startsWith("/quote") ? "active" : ""
              }`}
            >
              <span aria-hidden="true">↗</span>
              <span>Quote</span>
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
