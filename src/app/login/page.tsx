import React, { Suspense } from "react";
import AuthPortalClient from "../components/AuthPortalClient";

export const metadata = {
  title: "Staff & Admin Sign-In · Miss Kudi Productions Operations OS",
  description:
    "Authenticate to Miss Kudi Productions Superadmin HQ, Factory Admin Dashboard, and Floor Production Stations at 1 Alawode Street, Surulere, Lagos.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-portal-main">
          <div className="container">
            <div className="auth-portal-shell">
              <div className="glass-panel auth-desk-card">
                Loading Sign-In...
              </div>
            </div>
          </div>
        </main>
      }
    >
      <AuthPortalClient initialMode="signin" />
    </Suspense>
  );
}
