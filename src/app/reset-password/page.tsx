import React, { Suspense } from "react";
import AuthPortalClient from "../components/AuthPortalClient";

export const metadata = {
  title: "Reset Factory Password — Miss Kudi Productions Operations OS",
  description:
    "Verify a 6-digit one-time code to reset or initialize your Miss Kudi Productions Admin, Superadmin, or Artisan Floor Staff password.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-portal-main">
          <div className="container">
            <div className="glass-panel" style={{ padding: "2rem" }}>
              Loading Password Recovery Desk...
            </div>
          </div>
        </main>
      }
    >
      <AuthPortalClient initialMode="reset" />
    </Suspense>
  );
}
