"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AtelierWeaveCanvas from "./AtelierWeaveCanvas";
import {
  ACCESS_TIER_LABELS,
  ARTISAN_ROLE_LABELS,
  ArtisanStaff,
  clearCurrentSessionUser,
  ClientSessionMeta,
  getCurrentSessionMeta,
  getCurrentSessionUser,
  getRememberedEmail,
  INITIAL_ARTISANS,
  isSessionAuthenticated,
  loadArtisans,
  loadLocalPasswordHashes,
  saveArtisans,
  saveLocalPasswordHash,
  setCurrentSessionUser,
  setRememberedEmail,
  UserAccessTier,
} from "../lib/production-os";

type PortalMode =
  | "signin"
  | "reset-request"
  | "reset-verify"
  | "change-password";

interface AuthPortalClientProps {
  initialMode?: "signin" | "reset";
}

const TIER_BADGE_CLASS: Record<UserAccessTier, string> = {
  superadmin: "badge-gold",
  admin: "badge-blue",
  staff: "badge-green",
};

const ARCHITECTURAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function AuthPortalClient({
  initialMode = "signin",
}: AuthPortalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const otpAbortRef = useRef<AbortController | null>(null);
  const dirtyControlsRef = useRef<WeakMap<EventTarget, { interacted: boolean; blurred: boolean }>>(
    new WeakMap()
  );

  const toggleWarnId = useId();
  const resetToggleWarnId = useId();
  const changeToggleWarnId = useId();

  const redirectParam = searchParams.get("redirect") || "";
  const reasonParam = searchParams.get("reason") || "";
  const emailParam = searchParams.get("email") || "";
  const modeParam = searchParams.get("mode") || "";
  const signedOutParam = searchParams.get("signedOut") === "1";

  const [mode, setMode] = useState<PortalMode>(() => {
    if (modeParam === "change-password" || modeParam === "change") {
      return "change-password";
    }
    if (initialMode === "reset" || modeParam === "reset") {
      return "reset-request";
    }
    return "signin";
  });

  const [artisans, setArtisans] = useState<ArtisanStaff[]>(INITIAL_ARTISANS);
  const [sessionUser, setSessionUser] = useState<ArtisanStaff | null>(null);
  const [sessionMeta, setSessionMeta] = useState<ClientSessionMeta | null>(null);

  // Sign-In state
  const [email, setEmail] = useState("kudi@kproductions.com");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [hasRememberedEmail, setHasRememberedEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password Reset (OTP) state
  const [resetChallenge, setResetChallenge] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [dispatchPreview, setDispatchPreview] = useState<{
    otpCode: string;
    originBoundSmsSample: string;
  } | null>(null);

  // Authenticated Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextSelfPassword, setNextSelfPassword] = useState("");
  const [showSelfPassword, setShowSelfPassword] = useState(false);

  // Status & loading
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Hydrate remembered email, local roster, and live server cookie session
  useEffect(() => {
    const localRoster = loadArtisans();
    setArtisans(localRoster);

    const savedEmail = emailParam.trim() || getRememberedEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setHasRememberedEmail(Boolean(getRememberedEmail()));
    }

    if (isSessionAuthenticated()) {
      setSessionUser(getCurrentSessionUser());
      setSessionMeta(getCurrentSessionMeta());
    }

    if (signedOutParam) {
      setStatusMessage("You have been signed out and your session cookie was cleared.");
    } else if (reasonParam === "auth_required" && redirectParam) {
      setStatusMessage(
        `Sign in with an authorized Admin, Superadmin, or Staff account to continue to ${redirectParam}.`
      );
    }

    // Fetch authoritative server session & Neon directory
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.authenticated && data.user) {
          setSessionUser(data.user);
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
        }
      })
      .catch(() => {});

    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.users) && data.users.length > 0) {
          // Merge server users with any locally onboarded staff not yet pushed
          const serverEmails = new Set(
            data.users.map((u: ArtisanStaff) => u.email.toLowerCase())
          );
          const localExtras = loadArtisans().filter(
            (u) => !serverEmails.has(u.email.toLowerCase())
          );
          const merged = [...data.users, ...localExtras];
          setArtisans(merged);
          saveArtisans(merged);
        }
      })
      .catch(() => {});
  }, [emailParam, reasonParam, redirectParam, signedOutParam]);

  // modern-web-guidance (sms-otp-form): WebOTP progressive enhancement with AbortController
  const stopWebOtpListener = () => {
    if (otpAbortRef.current) {
      otpAbortRef.current.abort();
      otpAbortRef.current = null;
    }
  };

  useEffect(() => {
    if (mode !== "reset-verify") {
      stopWebOtpListener();
      return;
    }
    if (typeof window === "undefined" || !("OTPCredential" in window)) {
      return;
    }

    stopWebOtpListener();
    const ac = new AbortController();
    otpAbortRef.current = ac;

    (navigator.credentials as any)
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((cred: { code?: string } | null) => {
        if (!cred?.code) return;
        setOtpCode(cred.code);
        requestAnimationFrame(() => {
          // Trigger standard submit handler via requestSubmit() (never form.submit())
          otpFormRef.current?.requestSubmit();
        });
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") return;
      });

    return () => {
      stopWebOtpListener();
    };
  }, [mode, resetChallenge]);

  // modern-web-guidance (validate-input-after-interaction):
  // Sync aria-invalid & .user-invalid-fallback on blur (reveal) and input (clear/recover)
  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const state = dirtyControlsRef.current.get(input) || {
      interacted: false,
      blurred: false,
    };
    state.blurred = true;
    dirtyControlsRef.current.set(input, state);

    if (state.interacted || input.value.length > 0) {
      const valid = input.checkValidity();
      input.classList.toggle("user-invalid-fallback", !valid);
      input.classList.toggle("user-valid-fallback", valid);
      input.setAttribute("aria-invalid", valid ? "false" : "true");
    }
  };

  const handleFieldInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const state = dirtyControlsRef.current.get(input) || {
      interacted: false,
      blurred: false,
    };
    state.interacted = true;
    dirtyControlsRef.current.set(input, state);

    if (state.blurred || input.getAttribute("aria-invalid") === "true") {
      const valid = input.checkValidity();
      input.classList.toggle("user-invalid-fallback", !valid);
      input.classList.toggle("user-valid-fallback", valid);
      input.setAttribute("aria-invalid", valid ? "false" : "true");
    }
  };

  const focusAlert = () => {
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  };

  const resolveDestination = (user: ArtisanStaff): string => {
    if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//")
    ) {
      if (
        redirectParam.startsWith("/superadmin") &&
        user.accessTier !== "superadmin"
      ) {
        return "/dashboard";
      }
      return redirectParam;
    }
    return user.accessTier === "superadmin" ? "/superadmin" : "/dashboard";
  };

  // --- 1. SIGN IN HANDLER ---
  const handleSignInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid work email address.");
      focusAlert();
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      focusAlert();
      return;
    }

    setSubmitting(true);
    try {
      const localMatch = artisans.find(
        (a) => a.email.toLowerCase() === cleanEmail
      );
      const localHashes = loadLocalPasswordHashes();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          rememberMe,
          fallbackAccount: localMatch,
          fallbackPasswordHash: localHashes[cleanEmail],
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Invalid email or password.");
        focusAlert();
        return;
      }

      const authenticatedUser: ArtisanStaff = data.user;
      setRememberedEmail(cleanEmail, rememberMe);
      setHasRememberedEmail(rememberMe);
      setCurrentSessionUser(authenticatedUser, {
        rememberMe,
        expiresAt: data.session?.expiresAt,
        sessionId: data.session?.sessionId,
      });
      setSessionUser(authenticatedUser);
      setSessionMeta(getCurrentSessionMeta());

      const destination = resolveDestination(authenticatedUser);
      setStatusMessage(
        `Signed in as ${authenticatedUser.name} (${
          ACCESS_TIER_LABELS[authenticatedUser.accessTier]
        }). Opening ${destination}...`
      );

      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 360);
    } catch {
      setErrorMessage(
        "Unable to reach authentication service. Please check your connection and try again."
      );
      focusAlert();
    } finally {
      setSubmitting(false);
    }
  };

  // --- 2. REQUEST PASSWORD RESET OTP ---
  const handleRequestResetSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter your factory work email address.");
      focusAlert();
      return;
    }

    const knownClientAccount = artisans.some(
      (a) => a.email.toLowerCase() === cleanEmail
    );

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, knownClientAccount }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error || "Could not send a verification code for that email."
        );
        focusAlert();
        return;
      }

      setResetChallenge(data.resetChallenge || null);
      setDispatchPreview(data.dispatchPreview || null);
      setOtpCode("");
      setStatusMessage(
        data.message ||
          `Sent a 6-digit verification code to ${cleanEmail}.`
      );
      setMode("reset-verify");
      requestAnimationFrame(() => otpInputRef.current?.focus());
    } catch {
      setErrorMessage("Unable to request password reset right now.");
      focusAlert();
    } finally {
      setSubmitting(false);
    }
  };

  // --- 3. VERIFY 6-DIGIT OTP & SAVE NEW PASSWORD ---
  const handleCompleteResetSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    stopWebOtpListener();
    if (submitting) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMessage("Please enter the 6-digit numeric verification code.");
      focusAlert();
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setErrorMessage(
        "New password must be at least 8 characters and include a letter and a number."
      );
      focusAlert();
      return;
    }

    const localMatch = artisans.find(
      (a) => a.email.toLowerCase() === cleanEmail
    );

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword,
          resetChallenge,
          rememberMe,
          autoSignIn: true,
          fallbackAccount: localMatch,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error || "Could not verify code or update password."
        );
        focusAlert();
        return;
      }

      if (data.passwordHash) {
        saveLocalPasswordHash(cleanEmail, data.passwordHash);
      }

      const updatedUser: ArtisanStaff = data.user;
      setRememberedEmail(cleanEmail, rememberMe);
      setCurrentSessionUser(updatedUser, {
        rememberMe,
        expiresAt: data.session?.expiresAt,
        sessionId: data.session?.sessionId,
      });
      setSessionUser(updatedUser);
      setSessionMeta(getCurrentSessionMeta());
      setDispatchPreview(null);
      setResetChallenge(null);

      const destination = resolveDestination(updatedUser);
      setStatusMessage(
        `Password updated for ${updatedUser.email}. Signed in and redirecting to ${destination}...`
      );

      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 450);
    } catch {
      setErrorMessage("Password reset could not be completed. Try again.");
      focusAlert();
    } finally {
      setSubmitting(false);
    }
  };

  // --- 4. CHANGE OWN PASSWORD (AUTHENTICATED) ---
  const handleChangePasswordSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (submitting || !sessionUser) return;
    setErrorMessage(null);
    setStatusMessage(null);

    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      focusAlert();
      return;
    }
    if (
      nextSelfPassword.length < 8 ||
      !/[A-Za-z]/.test(nextSelfPassword) ||
      !/\d/.test(nextSelfPassword)
    ) {
      setErrorMessage(
        "New password must be at least 8 characters and include a letter and a number."
      );
      focusAlert();
      return;
    }

    setSubmitting(true);
    try {
      const localHashes = loadLocalPasswordHashes();
      const targetEmail = sessionUser.email.toLowerCase();
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail,
          currentPassword,
          newPassword: nextSelfPassword,
          fallbackPasswordHash: localHashes[targetEmail],
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Unable to change password.");
        focusAlert();
        return;
      }

      if (data.passwordHash) {
        saveLocalPasswordHash(targetEmail, data.passwordHash);
      }

      setCurrentPassword("");
      setNextSelfPassword("");
      setStatusMessage(
        `Password updated for ${sessionUser.name} (${sessionUser.email}).`
      );
    } catch {
      setErrorMessage("Failed to update password. Please try again.");
      focusAlert();
    } finally {
      setSubmitting(false);
    }
  };

  // --- 5. SIGN OUT HANDLER ---
  const handleSignOut = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear local session regardless
    } finally {
      clearCurrentSessionUser();
      setSessionUser(null);
      setSessionMeta(null);
      setPassword("");
      setSubmitting(false);
      setStatusMessage("Signed out of Miss Kudi Operations OS.");
      router.refresh();
    }
  };

  const handleSelectDirectoryAccount = (user: ArtisanStaff) => {
    setEmail(user.email);
    setErrorMessage(null);
    setStatusMessage(null);
    if (mode === "change-password") {
      setMode("signin");
    }
  };

  const handleForgetRememberedEmail = () => {
    setRememberedEmail("", false);
    setHasRememberedEmail(false);
    setRememberMe(false);
    setStatusMessage("Cleared remembered workstation email from this browser.");
  };

  const superadmins = artisans.filter((a) => a.accessTier === "superadmin");
  const admins = artisans.filter((a) => a.accessTier === "admin");
  const staffList = artisans.filter((a) => a.accessTier === "staff");

  const panelMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22, ease: ARCHITECTURAL_EASE },
      };

  return (
    <main className="auth-portal-main">
      <div className="container">
        <div className="auth-portal-shell">
          {/* Compact Top Identity Masthead (kept concise so mobile keyboards never cover inputs) */}
          <header className="auth-portal-masthead">
            <div className="auth-masthead-brand">
              <img
                src="/images/mk-logo-transparent.png"
                alt="Miss Kudi Productions"
                width={56}
                height={56}
                className="wordmark-logo-img"
                style={{ width: 56, height: 56 }}
              />
              <div>
                <div className="auth-masthead-kicker mono">
                  INTERNAL STAFF &amp; ADMIN AUTHENTICATION · YABA · VI · IKEJA
                </div>
                <h1 className="auth-masthead-title">
                  Factory Identity &amp;{" "}
                  <span className="text-gold">Operations Access</span>
                </h1>
              </div>
            </div>

            {sessionUser && (
              <div className="auth-active-banner">
                <div>
                  <span className="mono auth-active-kicker">
                    VERIFIED SESSION ·{" "}
                    {sessionMeta?.rememberMe ? "30D REMEMBERED" : "8H SHIFT"}
                  </span>
                  <div className="auth-active-user">
                    <strong>{sessionUser.name}</strong> ({sessionUser.email}){" "}
                    <span
                      className={`badge ${TIER_BADGE_CLASS[sessionUser.accessTier]}`}
                    >
                      {ACCESS_TIER_LABELS[sessionUser.accessTier]}
                    </span>
                  </div>
                </div>
                <div className="auth-active-actions">
                  <Link
                    href={
                      sessionUser.accessTier === "superadmin"
                        ? "/superadmin"
                        : "/dashboard"
                    }
                    className="btn-primary auth-compact-btn"
                  >
                    Continue to Portal →
                  </Link>
                  <button
                    type="button"
                    className="btn-secondary auth-compact-btn"
                    onClick={handleSignOut}
                    disabled={submitting}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </header>

          <div className="auth-split-grid">
            {/* LEFT COLUMN: Primary Credential & Recovery Desk */}
            <section
              className="glass-panel auth-desk-card"
              aria-labelledby="auth-desk-heading"
            >
              {/* Mode Switcher Tabs */}
              <div
                className="auth-mode-tabs"
                role="tablist"
                aria-label="Authentication and password management"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  className={`auth-mode-tab ${mode === "signin" ? "active" : ""}`}
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage(null);
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    mode === "reset-request" || mode === "reset-verify"
                  }
                  className={`auth-mode-tab ${
                    mode === "reset-request" || mode === "reset-verify"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setMode(resetChallenge ? "reset-verify" : "reset-request");
                    setErrorMessage(null);
                  }}
                >
                  Reset password
                </button>
                {sessionUser && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "change-password"}
                    className={`auth-mode-tab ${
                      mode === "change-password" ? "active" : ""
                    }`}
                    onClick={() => {
                      setMode("change-password");
                      setErrorMessage(null);
                    }}
                  >
                    Change password
                  </button>
                )}
              </div>

              {/* Dynamic Error & Status Alerts */}
              {errorMessage && (
                <div
                  ref={errorSummaryRef}
                  role="alert"
                  aria-live="assertive"
                  tabIndex={-1}
                  className="auth-alert auth-alert-error"
                >
                  <strong>⚠ Authentication check failed</strong>
                  <span>{errorMessage}</span>
                </div>
              )}

              {statusMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="auth-alert auth-alert-ok"
                >
                  <span>✓ {statusMessage}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ==================== VIEW 1: SIGN IN ==================== */}
                {mode === "signin" && (
                  <motion.div key="signin-view" {...panelMotion}>
                    <div className="auth-desk-header">
                      <h2 id="auth-desk-heading">Staff &amp; Admin Sign-In</h2>
                      <p>
                        Enter your authorized Miss Kudi work credentials for
                        Superadmin HQ, Plant Admin, or Floor Station access.
                      </p>
                    </div>

                    <form
                      action="/api/auth/login"
                      method="POST"
                      onSubmit={handleSignInSubmit}
                      noValidate
                    >
                      <div className="auth-field">
                        <label htmlFor="email" className="auth-label">
                          Work email
                        </label>
                        <span id="signin-email-hint" className="auth-hint">
                          Use your provisioned plant email (e.g.
                          kudi@kproductions.com).
                        </span>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className="auth-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={handleFieldBlur}
                          onInput={handleFieldInput}
                          autoComplete="username"
                          spellCheck={false}
                          autoCapitalize="none"
                          autoCorrect="off"
                          enterKeyHint="next"
                          aria-describedby="signin-email-hint"
                          required
                        />
                        <div className="auth-field-error" aria-live="polite">
                          <span aria-hidden="true">✕</span> Enter a valid work
                          email address.
                        </div>
                      </div>

                      <div className="auth-field">
                        <div className="auth-label-row">
                          <label
                            htmlFor="current-password"
                            className="auth-label"
                          >
                            Password
                          </label>
                          <div className="auth-password-tools">
                            <button
                              type="button"
                              className="auth-link-btn"
                              onClick={() => {
                                setErrorMessage(null);
                                setStatusMessage(null);
                                setMode("reset-request");
                              }}
                            >
                              Forgot password?
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                              aria-pressed={showPassword}
                              aria-describedby={toggleWarnId}
                              className="auth-show-toggle"
                            >
                              {showPassword ? "Hide" : "Show"}
                            </button>
                            <span id={toggleWarnId} className="visually-hidden">
                              Warning: this will display your password on the
                              screen.
                            </span>
                          </div>
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          id="current-password"
                          name="password"
                          className="auth-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={handleFieldBlur}
                          onInput={handleFieldInput}
                          autoComplete="current-password"
                          enterKeyHint="done"
                          placeholder="Enter your password"
                          required
                        />
                        <div className="auth-field-error" aria-live="polite">
                          <span aria-hidden="true">✕</span> Password is required
                          to sign in.
                        </div>
                      </div>

                      {/* Remember Me & Workstation Persistence */}
                      <div className="auth-remember-box">
                        <label
                          htmlFor="remember-me"
                          className="auth-remember-label"
                        >
                          <input
                            type="checkbox"
                            id="remember-me"
                            name="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <div>
                            <span className="auth-remember-title">
                              Remember me on this workstation for 30 days
                            </span>
                            <span className="auth-remember-desc">
                              {rememberMe
                                ? "Saves your work email and issues a 30-day persistent HttpOnly cookie. Uncheck on shared sewing or QC tablets."
                                : "Shared floor terminal mode: 8-hour shift session clears automatically when the browser closes."}
                            </span>
                          </div>
                        </label>
                        {hasRememberedEmail && (
                          <button
                            type="button"
                            className="auth-forget-email-btn"
                            onClick={handleForgetRememberedEmail}
                          >
                            Clear saved email
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn-primary auth-submit-btn"
                        disabled={submitting}
                      >
                        {submitting
                          ? "Verifying credentials..."
                          : "Sign in to Operations Portal"}
                      </button>

                      <div className="auth-secondary-links">
                        <span>Need a standalone recovery link?</span>
                        <Link
                          href={`/reset-password?email=${encodeURIComponent(
                            email.trim()
                          )}`}
                          className="auth-inline-anchor"
                        >
                          Open /reset-password →
                        </Link>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* ==================== VIEW 2A: REQUEST PASSWORD RESET ==================== */}
                {mode === "reset-request" && (
                  <motion.div key="reset-request-view" {...panelMotion}>
                    <div className="auth-desk-header">
                      <span className="mono auth-step-pill">
                        STEP 1 OF 2 · REQUEST VERIFICATION CODE
                      </span>
                      <h2 id="auth-desk-heading">Reset your factory password</h2>
                      <p>
                        Enter your provisioned Admin, Superadmin, or Floor Staff
                        email to receive a 6-digit one-time verification code
                        valid for 15 minutes.
                      </p>
                    </div>

                    <form
                      action="/api/auth/forgot-password"
                      method="POST"
                      onSubmit={handleRequestResetSubmit}
                      noValidate
                    >
                      <div className="auth-field">
                        <label htmlFor="reset-email" className="auth-label">
                          Work email address
                        </label>
                        <span id="reset-email-hint" className="auth-hint">
                          Works for initial password setup on newly onboarded
                          staff accounts and locked accounts.
                        </span>
                        <input
                          type="email"
                          id="reset-email"
                          name="email"
                          className="auth-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={handleFieldBlur}
                          onInput={handleFieldInput}
                          autoComplete="username"
                          spellCheck={false}
                          autoCapitalize="none"
                          autoCorrect="off"
                          enterKeyHint="done"
                          aria-describedby="reset-email-hint"
                          required
                        />
                        <div className="auth-field-error" aria-live="polite">
                          <span aria-hidden="true">✕</span> Enter a valid work
                          email address.
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn-primary auth-submit-btn"
                        disabled={submitting}
                      >
                        {submitting
                          ? "Generating 6-digit code..."
                          : "Send 6-digit verification code"}
                      </button>

                      <div className="auth-secondary-links">
                        <button
                          type="button"
                          className="auth-link-btn"
                          onClick={() => {
                            setErrorMessage(null);
                            setMode("signin");
                          }}
                        >
                          ← Back to Sign in
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* ==================== VIEW 2B: VERIFY OTP & SET NEW PASSWORD ==================== */}
                {mode === "reset-verify" && (
                  <motion.div key="reset-verify-view" {...panelMotion}>
                    <div className="auth-desk-header">
                      <span className="mono auth-step-pill">
                        STEP 2 OF 2 · VERIFY CODE &amp; SET NEW PASSWORD
                      </span>
                      <h2 id="auth-desk-heading">
                        Enter 6-digit code &amp; new password
                      </h2>
                      <p>
                        Verifying recovery for <strong>{email}</strong>.
                      </p>
                    </div>

                    {/* Atelier Console Dispatch Preview when running without external SMTP */}
                    {dispatchPreview && (
                      <div className="auth-dispatch-preview">
                        <div className="auth-dispatch-top">
                          <span className="mono">
                            ATELIER DISPATCH PREVIEW · 15M TTL
                          </span>
                          <button
                            type="button"
                            className="auth-autofill-otp-btn"
                            onClick={() => setOtpCode(dispatchPreview.otpCode)}
                          >
                            Fill code {dispatchPreview.otpCode}
                          </button>
                        </div>
                        <pre className="mono auth-dispatch-sms">
                          {dispatchPreview.originBoundSmsSample}
                        </pre>
                      </div>
                    )}

                    <form
                      ref={otpFormRef}
                      action="/api/auth/reset-password"
                      method="POST"
                      onSubmit={handleCompleteResetSubmit}
                      noValidate
                    >
                      {/* Hidden username field so password managers associate new-password with this email */}
                      <input
                        type="email"
                        name="username"
                        value={email}
                        autoComplete="username"
                        readOnly
                        tabIndex={-1}
                        className="visually-hidden"
                      />

                      <div className="auth-field">
                        <label htmlFor="otp-input" className="auth-label">
                          6-digit verification code
                        </label>
                        {/* Hint placed ABOVE input per modern-web-guidance (sms-otp-form) */}
                        <p id="otp-format-hint" className="auth-hint">
                          Enter the 6-digit code sent to your work dispatch
                          (single input supports paste and automatic OTP
                          autofill).
                        </p>
                        <input
                          ref={otpInputRef}
                          type="text"
                          id="otp-input"
                          name="otp"
                          className="auth-input auth-otp-input mono"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          onBlur={handleFieldBlur}
                          onInput={handleFieldInput}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          pattern="\d{6}"
                          maxLength={6}
                          enterKeyHint="next"
                          aria-describedby="otp-format-hint"
                          placeholder="000000"
                          required
                        />
                        <div className="auth-field-error" aria-live="polite">
                          <span aria-hidden="true">✕</span> Enter all 6 numeric
                          digits.
                        </div>
                      </div>

                      <div className="auth-field">
                        <div className="auth-label-row">
                          <label htmlFor="new-password" className="auth-label">
                            New password
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            aria-label={
                              showNewPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            aria-pressed={showNewPassword}
                            aria-describedby={resetToggleWarnId}
                            className="auth-show-toggle"
                          >
                            {showNewPassword ? "Hide" : "Show"}
                          </button>
                          <span
                            id={resetToggleWarnId}
                            className="visually-hidden"
                          >
                            Warning: this will display your new password on the
                            screen.
                          </span>
                        </div>
                        {/* Complexity rules placed ABOVE input per validate-input-after-interaction */}
                        <ul id="password-rules" className="auth-rules-list">
                          <li>At least 8 characters</li>
                          <li>Includes at least one letter and one number</li>
                        </ul>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          id="new-password"
                          name="new-password"
                          className="auth-input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onBlur={handleFieldBlur}
                          onInput={handleFieldInput}
                          autoComplete="new-password"
                          pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                          minLength={8}
                          enterKeyHint="done"
                          aria-describedby="password-rules"
                          placeholder="Create a strong password"
                          required
                        />
                        <div className="auth-field-error" aria-live="polite">
                          <span aria-hidden="true">✕</span> Use 8+ characters
                          with at least one letter and one number.
                        </div>
                      </div>

                      <div className="auth-remember-box">
                        <label
                          htmlFor="reset-remember-me"
                          className="auth-remember-label"
                        >
                          <input
                            type="checkbox"
                            id="reset-remember-me"
                            name="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <div>
                            <span className="auth-remember-title">
                              Keep me signed in for 30 days after reset
                            </span>
                            <span className="auth-remember-desc">
                              Prior active sessions on other devices are
                              automatically revoked.
                            </span>
                          </div>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="btn-primary auth-submit-btn"
                        disabled={submitting}
                      >
                        {submitting
                          ? "Updating password & signing in..."
                          : "Save new password & Sign in"}
                      </button>

                      <div className="auth-secondary-links">
                        <button
                          type="button"
                          className="auth-link-btn"
                          onClick={() => {
                            stopWebOtpListener();
                            setMode("reset-request");
                          }}
                        >
                          Resend or change email
                        </button>
                        <button
                          type="button"
                          className="auth-link-btn"
                          onClick={() => {
                            stopWebOtpListener();
                            setMode("signin");
                          }}
                        >
                          Back to Sign in
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* ==================== VIEW 3: AUTHENTICATED CHANGE PASSWORD ==================== */}
                {mode === "change-password" && sessionUser && (
                  <motion.div key="change-password-view" {...panelMotion}>
                    <div className="auth-desk-header">
                      <span className="mono auth-step-pill">
                        ACTIVE OPERATOR SECURITY
                      </span>
                      <h2 id="auth-desk-heading">Change your password</h2>
                      <p>
                        Updating credentials for{" "}
                        <strong>{sessionUser.name}</strong> ({sessionUser.email}
                        ).
                      </p>
                    </div>

                    <form
                      action="/api/auth/change-password"
                      method="POST"
                      onSubmit={handleChangePasswordSubmit}
                      noValidate
                    >
                      <input
                        type="email"
                        name="username"
                        value={sessionUser.email}
                        autoComplete="username"
                        readOnly
                        tabIndex={-1}
                        className="visually-hidden"
                      />

                      <div className="auth-field">
                        <label
                          htmlFor="self-current-password"
                          className="auth-label"
                        >
                          Current password
                        </label>
                        <input
                          type={showSelfPassword ? "text" : "password"}
                          id="self-current-password"
                          name="currentPassword"
                          className="auth-input"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          autoComplete="current-password"
                          enterKeyHint="next"
                          required
                        />
                      </div>

                      <div className="auth-field">
                        <div className="auth-label-row">
                          <label
                            htmlFor="self-new-password"
                            className="auth-label"
                          >
                            New password
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowSelfPassword((prev) => !prev)}
                            aria-label={
                              showSelfPassword
                                ? "Hide passwords"
                                : "Show passwords"
                            }
                            aria-pressed={showSelfPassword}
                            aria-describedby={changeToggleWarnId}
                            className="auth-show-toggle"
                          >
                            {showSelfPassword ? "Hide" : "Show"}
                          </button>
                          <span
                            id={changeToggleWarnId}
                            className="visually-hidden"
                          >
                            Warning: this will display your passwords on the
                            screen.
                          </span>
                        </div>
                        <ul
                          id="self-password-rules"
                          className="auth-rules-list"
                        >
                          <li>At least 8 characters</li>
                          <li>Includes at least one letter and one number</li>
                        </ul>
                        <input
                          type={showSelfPassword ? "text" : "password"}
                          id="self-new-password"
                          name="newPassword"
                          className="auth-input"
                          value={nextSelfPassword}
                          onChange={(e) => setNextSelfPassword(e.target.value)}
                          onBlur={handleFieldBlur}
                          onInput={handleFieldInput}
                          autoComplete="new-password"
                          pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                          minLength={8}
                          enterKeyHint="done"
                          aria-describedby="self-password-rules"
                          required
                        />
                        <div className="auth-field-error" aria-live="polite">
                          <span aria-hidden="true">✕</span> Use 8+ characters
                          with at least one letter and one number.
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn-primary auth-submit-btn"
                        disabled={submitting}
                      >
                        {submitting
                          ? "Updating password..."
                          : "Update password"}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* RIGHT COLUMN: Atelier Weave Canvas + Editorial Numbered RBAC Directory Ledger */}
            <aside
              aria-labelledby="directory-accounts-heading"
              className="auth-ledger-column"
            >
              <AtelierWeaveCanvas
                mode={mode}
                authenticatedTier={sessionUser?.accessTier || null}
                rememberMe={rememberMe}
              />

              <div className="glass-panel auth-directory-ledger">
                <div className="auth-directory-head">
                  <div>
                    <span className="mono auth-ledger-kicker">
                      PROVISIONED RBAC DIRECTORY
                    </span>
                    <h2 id="directory-accounts-heading">
                      Authorized Factory Accounts ({artisans.length})
                    </h2>
                  </div>
                  <Link
                    href="/api/health"
                    className="btn-secondary auth-compact-btn"
                  >
                    /api/health ↗
                  </Link>
                </div>

                {/* 01 · Superadmin Governance */}
                <div className="auth-tier-group">
                  <div className="auth-tier-heading mono">
                    <span>01 / SUPERADMIN GOVERNANCE</span>
                    <span>MULTI-FACILITY HQ</span>
                  </div>
                  <div className="auth-ledger-rows">
                    {superadmins.map((user) => {
                      const selected =
                        email.trim().toLowerCase() === user.email.toLowerCase();
                      return (
                        <div
                          key={user.id}
                          className={`auth-ledger-row ${
                            selected ? "selected" : ""
                          }`}
                        >
                          <div>
                            <div className="auth-ledger-name">
                              {user.name}{" "}
                              <span className="badge badge-gold">
                                SUPERADMIN
                              </span>
                            </div>
                            <div className="auth-ledger-meta mono">
                              {user.email} · {user.station}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary auth-select-btn"
                            onClick={() => handleSelectDirectoryAccount(user)}
                          >
                            {selected ? "Selected ✓" : "Use email"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 02 · Factory Admins */}
                <div className="auth-tier-group">
                  <div className="auth-tier-heading mono">
                    <span>02 / FACTORY ADMIN TIER</span>
                    <span>PLANT &amp; MERCHANDISING LEADS</span>
                  </div>
                  <div className="auth-ledger-rows">
                    {admins.map((user) => {
                      const selected =
                        email.trim().toLowerCase() === user.email.toLowerCase();
                      return (
                        <div
                          key={user.id}
                          className={`auth-ledger-row ${
                            selected ? "selected" : ""
                          }`}
                        >
                          <div>
                            <div className="auth-ledger-name">
                              {user.name}{" "}
                              <span className="badge badge-blue">ADMIN</span>
                            </div>
                            <div className="auth-ledger-meta mono">
                              {user.email} · {user.branchName}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary auth-select-btn"
                            onClick={() => handleSelectDirectoryAccount(user)}
                          >
                            {selected ? "Selected ✓" : "Use email"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 03 · Artisan Floor Staff */}
                <div className="auth-tier-group" style={{ marginBottom: 0 }}>
                  <div className="auth-tier-heading mono">
                    <span>03 / ARTISAN FLOOR STAFF</span>
                    <span>PATTERN · CUTTING · SEWING · QC</span>
                  </div>
                  {staffList.length === 0 ? (
                    <div className="auth-empty-staff">
                      No floor staff accounts provisioned yet. Sign in as{" "}
                      <strong>Admin</strong> or <strong>Superadmin</strong> to
                      onboard Pattern Designers, Cutting Masters, Tailors, and
                      AQL 2.5 QC Inspectors with dedicated passwords, or let new
                      hires claim their password via{" "}
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => setMode("reset-request")}
                      >
                        Reset password
                      </button>
                      .
                    </div>
                  ) : (
                    <div className="auth-ledger-rows">
                      {staffList.map((user) => {
                        const selected =
                          email.trim().toLowerCase() ===
                          user.email.toLowerCase();
                        return (
                          <div
                            key={user.id}
                            className={`auth-ledger-row ${
                              selected ? "selected" : ""
                            }`}
                          >
                            <div>
                              <div className="auth-ledger-name">
                                {user.name}{" "}
                                <span className="badge badge-green">
                                  {ARTISAN_ROLE_LABELS[user.role]}
                                </span>
                              </div>
                              <div className="auth-ledger-meta mono">
                                {user.email} · {user.station}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-secondary auth-select-btn"
                              onClick={() => handleSelectDirectoryAccount(user)}
                            >
                              {selected ? "Selected ✓" : "Use email"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
