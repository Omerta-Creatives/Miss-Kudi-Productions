"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ACCESS_TIER_LABELS,
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
  const dirtyControlsRef = useRef<
    WeakMap<EventTarget, { interacted: boolean; blurred: boolean }>
  >(new WeakMap());

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
  const [, setSessionMeta] = useState<ClientSessionMeta | null>(null);

  // Sign-In state
  const [email, setEmail] = useState("");
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
    setArtisans(loadArtisans());

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
      setStatusMessage("You have been signed out.");
    } else if (reasonParam === "auth_required" && redirectParam) {
      setStatusMessage(`Sign in to continue to ${redirectParam}.`);
    }

    // Fetch authoritative server session
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

    (
      navigator.credentials as CredentialsContainer & {
        get: (options?: CredentialRequestOptions & Record<string, unknown>) => Promise<{ code?: string } | null>;
      }
    )
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((cred) => {
        if (!cred?.code) return;
        setOtpCode(cred.code);
        requestAnimationFrame(() => {
          otpFormRef.current?.requestSubmit();
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });

    return () => {
      stopWebOtpListener();
    };
  }, [mode, resetChallenge]);

  // modern-web-guidance (forms): validate on blur, clear active errors on input
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

    input.classList.remove("user-invalid-fallback");
    if (input.getAttribute("aria-invalid") === "true") {
      input.removeAttribute("aria-invalid");
    }
    if (state.blurred) {
      input.classList.toggle(
        "user-valid-fallback",
        input.value.length > 0 && input.checkValidity()
      );
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
        `Signed in as ${authenticatedUser.name}. Opening ${destination}...`
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
      setErrorMessage("Please enter your work email address.");
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
        data.message || `Sent a 6-digit verification code to ${cleanEmail}.`
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
        `Password updated. Redirecting to ${destination}...`
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
      setStatusMessage(`Password updated for ${sessionUser.email}.`);
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
      setMode("signin");
      setSubmitting(false);
      setStatusMessage("Signed out of Miss Kudi Operations.");
      router.refresh();
    }
  };

  const handleForgetRememberedEmail = () => {
    setRememberedEmail("", false);
    setHasRememberedEmail(false);
    setRememberMe(false);
    setStatusMessage("Cleared saved email from this browser.");
  };

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
          {sessionUser && (
            <div className="auth-active-banner">
              <div className="auth-active-user">
                <span>Signed in as</span>
                <strong>{sessionUser.name}</strong>
                <span
                  className={`badge ${TIER_BADGE_CLASS[sessionUser.accessTier]}`}
                >
                  {ACCESS_TIER_LABELS[sessionUser.accessTier]}
                </span>
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
                    Open Console
                  </Link>
                <button
                  type="button"
                  className="btn-secondary auth-compact-btn"
                  onClick={handleSignOut}
                  disabled={submitting}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          <section
            className="glass-panel auth-desk-card"
            aria-labelledby="auth-desk-heading"
          >
            {sessionUser && (
              <div
                className="auth-mode-tabs"
                role="tablist"
                aria-label="Account actions"
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
              </div>
            )}

            {/* Dynamic Error & Status Alerts */}
            {errorMessage && (
              <div
                ref={errorSummaryRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="auth-alert auth-alert-error"
              >
                <strong>Sign-in check failed</strong>
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
                    <h1 id="auth-desk-heading">Sign in</h1>
                    <p>Enter your Miss Kudi work credentials to continue.</p>
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
                        placeholder="name@misskudi.com"
                        aria-describedby="signin-email-error"
                        required
                      />
                      <div
                        id="signin-email-error"
                        className="auth-field-error"
                        aria-live="polite"
                      >
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
                        aria-describedby="signin-password-error"
                        required
                      />
                      <div
                        id="signin-password-error"
                        className="auth-field-error"
                        aria-live="polite"
                      >
                        <span aria-hidden="true">✕</span> Password is required
                        to sign in.
                      </div>
                    </div>

                    <div className="auth-options-row">
                      <label
                        htmlFor="remember-me"
                        className="auth-remember-inline"
                      >
                        <input
                          type="checkbox"
                          id="remember-me"
                          name="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>Keep me signed in for 30 days</span>
                      </label>

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
                    </div>

                    {hasRememberedEmail && (
                      <div className="auth-saved-email-row">
                        <button
                          type="button"
                          className="auth-forget-email-btn"
                          onClick={handleForgetRememberedEmail}
                        >
                          Clear saved email
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-primary auth-submit-btn"
                      disabled={submitting}
                    >
                      {submitting ? "Signing in..." : "Sign in"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ==================== VIEW 2A: REQUEST PASSWORD RESET ==================== */}
              {mode === "reset-request" && (
                <motion.div key="reset-request-view" {...panelMotion}>
                  <div className="auth-desk-header">
                    <h1 id="auth-desk-heading">Reset password</h1>
                    <p>
                      Enter your work email to receive a 6-digit verification
                      code.
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
                        Work email
                      </label>
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
                        placeholder="name@misskudi.com"
                        aria-describedby="reset-email-error"
                        required
                      />
                      <div
                        id="reset-email-error"
                        className="auth-field-error"
                        aria-live="polite"
                      >
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
                        ? "Sending code..."
                        : "Send verification code"}
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
                        Back to sign in
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ==================== VIEW 2B: VERIFY OTP & SET NEW PASSWORD ==================== */}
              {mode === "reset-verify" && (
                <motion.div key="reset-verify-view" {...panelMotion}>
                  <div className="auth-desk-header">
                    <h1 id="auth-desk-heading">Verify recovery code</h1>
                    <p>
                      Enter the 6-digit code sent to <strong>{email}</strong>{" "}
                      and choose a new password.
                    </p>
                  </div>

                  {dispatchPreview && (
                    <div className="auth-dispatch-preview">
                      <div className="auth-dispatch-top">
                        <span className="mono">Verification preview</span>
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
                        aria-describedby="otp-field-error"
                        placeholder="000000"
                        required
                      />
                      <div
                        id="otp-field-error"
                        className="auth-field-error"
                        aria-live="polite"
                      >
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
                      <span id="password-rules" className="auth-hint">
                        At least 8 characters, including a letter and a number.
                      </span>
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
                        aria-describedby="password-rules reset-password-error"
                        placeholder="Create a strong password"
                        required
                      />
                      <div
                        id="reset-password-error"
                        className="auth-field-error"
                        aria-live="polite"
                      >
                        <span aria-hidden="true">✕</span> Use 8+ characters with
                        at least one letter and one number.
                      </div>
                    </div>

                    <div className="auth-options-row">
                      <label
                        htmlFor="reset-remember-me"
                        className="auth-remember-inline"
                      >
                        <input
                          type="checkbox"
                          id="reset-remember-me"
                          name="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>Keep me signed in for 30 days</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary auth-submit-btn"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Updating..."
                        : "Save & sign in"}
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
                        Resend code
                      </button>
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => {
                          stopWebOtpListener();
                          setMode("signin");
                        }}
                      >
                        Back to sign in
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ==================== VIEW 3: AUTHENTICATED CHANGE PASSWORD ==================== */}
              {mode === "change-password" && sessionUser && (
                <motion.div key="change-password-view" {...panelMotion}>
                  <div className="auth-desk-header">
                    <h1 id="auth-desk-heading">Change password</h1>
                    <p>
                      Update the password for{" "}
                      <strong>{sessionUser.email}</strong>.
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
                      <span id="self-password-rules" className="auth-hint">
                        At least 8 characters, including a letter and a number.
                      </span>
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
                        aria-describedby="self-password-rules self-password-error"
                        required
                      />
                      <div
                        id="self-password-error"
                        className="auth-field-error"
                        aria-live="polite"
                      >
                        <span aria-hidden="true">✕</span> Use 8+ characters with
                        at least one letter and one number.
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary auth-submit-btn"
                      disabled={submitting}
                    >
                      {submitting ? "Updating password..." : "Update password"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
}
