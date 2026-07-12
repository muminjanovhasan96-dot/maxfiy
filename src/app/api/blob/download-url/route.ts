import { NextResponse, type NextRequest } from "next/server";
import { getBlobRef } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const url = await getBlobRef(key);
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ downloadUrl: url });
}
