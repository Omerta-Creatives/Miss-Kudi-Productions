import { NextRequest, NextResponse } from "next/server";
import { getPlatformStatus } from "../../lib/database";
import {
  attachRateLimitHeaders,
  enforceRequestRateLimit,
  RATE_LIMIT_PROFILES,
} from "../../lib/rate-limit";

export async function GET(request: NextRequest) {
  const { blocked, result } = enforceRequestRateLimit(
    request,
    RATE_LIMIT_PROFILES.healthRead
  );
  if (blocked) return blocked;

  const status = getPlatformStatus();
  return attachRateLimitHeaders(
    NextResponse.json({
      status: "ok",
      platform: "Miss Kudi Productions — Operations OS",
      ...status,
      timestamp: new Date().toISOString(),
    }),
    result
  );
}
