import { NextRequest, NextResponse } from "next/server";
import {
  guardSameOriginMutation,
  requireAuthenticatedSession,
} from "../../../lib/auth-server";
import {
  getPlatformStatus,
  initializeDatabaseSchemaAndSeed,
} from "../../../lib/database";
import {
  attachRateLimitHeaders,
  enforceRequestRateLimit,
  RATE_LIMIT_PROFILES,
} from "../../../lib/rate-limit";

export async function POST(request: NextRequest) {
  const blocked = guardSameOriginMutation(request);
  if (blocked) return blocked;

  const rateCheck = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.adminWrite
  );
  if (rateCheck.blocked) return rateCheck.blocked;

  const auth = await requireAuthenticatedSession(request, ["superadmin"]);
  if (auth.denied) return attachRateLimitHeaders(auth.denied, rateCheck.result);

  const status = getPlatformStatus();

  if (status.databaseConnected) {
    try {
      const result = await initializeDatabaseSchemaAndSeed();
      return attachRateLimitHeaders(
        NextResponse.json({
          ok: true,
          status: "initialized",
          mode: status.databaseMode,
          auth: status.authMode,
          tables_ready: true,
          tables: result.tablesCreated,
          seeded_counts: result.seededCounts,
          message: `Database schema verified (${result.tablesCreated.length} tables active).`,
          timestamp: new Date().toISOString(),
        }),
        rateCheck.result
      );
    } catch (err: any) {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            status: "error",
            mode: status.databaseMode,
            message: `Database initialization error: ${
              err?.message || "Unknown error"
            }`,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        ),
        rateCheck.result
      );
    }
  }

  return attachRateLimitHeaders(
    NextResponse.json({
      ok: true,
      status: "initialized",
      mode: status.databaseMode,
      auth: status.authMode,
      tables_ready: true,
      tables: [
        "factory_branches",
        "staff_users",
        "production_orders",
        "fabric_inventory",
        "supplier_purchase_orders",
        "factory_expenses",
        "audit_logs",
      ],
      message: "Operations schema verified and ready.",
      timestamp: new Date().toISOString(),
    }),
    rateCheck.result
  );
}
