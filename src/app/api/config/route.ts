/**
 * Tells the client whether the server has cloud storage configured, so the app
 * can pick the cloud backend automatically (no reliance on a build-time flag).
 */
import { NextResponse } from "next/server";
import { cloudConfigured } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ cloud: cloudConfigured() });
}
