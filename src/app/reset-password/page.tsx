import React, { Suspense } from "react";
import AuthPortalClient from "../components/AuthPortalClient";

export const metadata = {
  title: "Reset Factory Password · Miss Kudi Productions",
  description:
    "Verify a 6-digit recovery code to reset or initialize your Miss Kudi Productions Admin, Superadmin, or Artisan Floor Staff password.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-portal-main">
          <div className="container">
            <div className="auth-portal-shell">
              <div className="glass-panel auth-desk-card">
                Loading Password Reset...
              </div>
            </div>
          </div>
        </main>
      }
    >
      <AuthPortalClient initialMode="reset" />
    </Suspense>
  );
}
