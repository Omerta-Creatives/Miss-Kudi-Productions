import { NextResponse } from "next/server";
import { getPlatformStatus } from "../../lib/neon-clerk";

export async function GET() {
  const status = getPlatformStatus();
  return NextResponse.json({
    status: "ok",
    platform: "Miss Kudi Productions — Factory OS",
    ...status,
    timestamp: new Date().toISOString(),
  });
}
