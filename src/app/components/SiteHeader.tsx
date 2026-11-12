"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ACCESS_TIER_LABELS,
  ARTISAN_ROLE_LABELS,
  ArtisanStaff,
  clearCurrentSessionUser,
  ClientSessionMeta,
  getCurrentSessionMeta,
  getCurrentSessionUser,
  INITIAL_ARTISANS,
  isSessionAuthenticated,
  isSuperAdminUser,
  setCurrentSessionUser,
} from "../lib/production-os";
import { UiIcon } from "./UiIcon";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerTitleId = useId();

  const [authenticated, setAuthenticated] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<ClientSessionMeta | null>(null);
  const [user, setUser] = useState<ArtisanStaff>(INITIAL_ARTISANS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      setUser(getCurrentSessionUser());
    };
    syncState();

    if (isInternalRoute) {
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((data) => {
          if (data?.authenticated && data.user) {
            setAuthenticated(true);
            setUser(data.user);
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

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear local session state even if offline
    } finally {
      clearCurrentSessionUser();
      setAuthenticated(false);
      setSessionMeta(null);
      setSigningOut(false);
      setDrawerOpen(false);
      router.push("/login?signedOut=1");
      router.refresh();
    }
  };

  const isSuper = authenticated && isSuperAdminUser(user);

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
        ...(isSuper ? [{ href: "/superadmin", label: "Superadmin HQ" }] : []),
        {
          href: "/dashboard",
          label: user.accessTier === "staff" ? "My Station" : "Plant Console",
        },
        { href: "/workspace", label: "Workspace" },
        { href: "/tracker", label: "Order Tracker" },
      ]
    : [
        { href: "/login", label: "Sign In" },
        { href: "/reset-password", label: "Reset Password" },
      ];

  const navLinks = isInternalRoute ? internalNavLinks : publicNavLinks;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

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
              alt="Miss Kudi Productions, Surulere, Lagos Atelier"
              width={64}
              height={64}
              className="wordmark-logo-img"
            />
          </Link>
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
                aria-current={active ? "page" : undefined}
                className={active ? "active-nav-link" : ""}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions-group">
          {isInternalRoute ? (
            authenticated ? (
              <>
                <div className="header-session-cluster desktop-cta">
                  <span className="header-user-pill">
                    <span>{user.name}</span>
                    <small className="mono">{ACCESS_TIER_LABELS[user.accessTier]}</small>
                  </span>
                  <Link
                    className="button button-light internal-exit-btn"
                    href="/"
                  >
                    Public Site
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="header-signout-btn"
                  >
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </>
            ) : (
              <div className="header-session-cluster desktop-cta">
                <Link
                  className="button button-light internal-exit-btn"
                  href="/"
                >
                  Public Site
                </Link>
                {!pathname.startsWith("/login") && (
                  <Link className="button button-dark header-cta" href="/login">
                    Sign In
                  </Link>
                )}
              </div>
            )
          ) : (
            <div className="header-session-cluster desktop-cta">
              {authenticated && (
                <>
                  <Link
                    className="button button-light internal-exit-btn"
                    href={isSuper ? "/superadmin" : "/dashboard"}
                  >
                    Console
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="header-signout-btn"
                  >
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </>
              )}
              <Link className="button button-dark header-cta" href="/quote">
                Request Quote
              </Link>
            </div>
          )}

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
              width={48}
              height={48}
              className="wordmark-logo-img"
              style={{ width: 48, height: 48 }}
            />
            <div id={drawerTitleId} className="mkp-muted-text" style={{ fontSize: 12, fontWeight: 600 }}>
              {authenticated
                ? ACCESS_TIER_LABELS[user.accessTier]
                : "Surulere, Lagos Atelier"}
            </div>
          </div>
          <button
            type="button"
            className="mobile-drawer-close"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          >
            Close
          </button>
        </div>

        {authenticated && (
          <div className="mobile-drawer-session-card">
            <div className="ticket-label">
              Active session ({sessionMeta?.rememberMe ? "30d workstation" : "8h shift"})
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
              {user.name}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}
            >
              {ARTISAN_ROLE_LABELS[user.role]}, {user.branchName}
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
                {signingOut ? "Signing out..." : "Sign Out"}
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
                  Plant Console
                </Link>
                <Link
                  href="/"
                  className="button button-light"
                  style={{ width: "100%", border: "1px solid var(--line)" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Public Website
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
                  Sign In
                </Link>
                <Link
                  href="/reset-password"
                  className="button button-light"
                  style={{ width: "100%", border: "1px solid var(--line)" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Reset Password
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
                Request Quote
              </Link>
              <Link
                href="/size-charts"
                className="button button-light"
                style={{ width: "100%", border: "1px solid var(--line)" }}
                onClick={() => setDrawerOpen(false)}
              >
                Size &amp; Grading
              </Link>
            </>
          )}
        </div>
      </dialog>

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
                <span>Console</span>
              </Link>
              <Link
                href="/workspace"
                className={`mobile-dock-item ${
                  pathname.startsWith("/workspace") ? "active" : ""
                }`}
              >
                <UiIcon name="settings" size={14} />
                <span>Workspace</span>
              </Link>
              {isSuper && (
                <Link
                  href="/superadmin"
                  className={`mobile-dock-item ${
                    pathname.startsWith("/superadmin") ? "active" : ""
                  }`}
                >
                  <UiIcon name="star" size={14} />
                  <span>HQ</span>
                </Link>
              )}
              <Link
                href="/tracker"
                className={`mobile-dock-item ${
                  pathname.startsWith("/tracker") ? "active" : ""
                }`}
              >
                <span>Tracker</span>
              </Link>
              <button
                type="button"
                className="mobile-dock-item mobile-dock-btn"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`mobile-dock-item ${
                  pathname.startsWith("/login") ? "active" : ""
                }`}
              >
                <UiIcon name="lock" size={14} />
                <span>Sign In</span>
              </Link>
              <Link
                href="/reset-password"
                className={`mobile-dock-item ${
                  pathname.startsWith("/reset-password") ? "active" : ""
                }`}
              >
                <span>Reset</span>
              </Link>
              <Link href="/" className="mobile-dock-item">
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
              <span>Home</span>
            </Link>
            <Link
              href="/services"
              className={`mobile-dock-item ${
                pathname.startsWith("/services") ? "active" : ""
              }`}
            >
              <span>Services</span>
            </Link>
            <Link
              href="/process"
              className={`mobile-dock-item ${
                pathname.startsWith("/process") ? "active" : ""
              }`}
            >
              <span>Process</span>
            </Link>
            <Link
              href="/size-charts"
              className={`mobile-dock-item ${
                pathname.startsWith("/size-charts") ? "active" : ""
              }`}
            >
              <span>Grading</span>
            </Link>
            <Link
              href="/quote"
              className={`mobile-dock-item ${
                pathname.startsWith("/quote") ? "active" : ""
              }`}
            >
              <span>Quote</span>
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
