import { NextResponse, type NextRequest } from "next/server";
import { listStubs, parseListOptions } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const opts = parseListOptions(req.nextUrl.searchParams);
  return NextResponse.json({ stubs: await listStubs(opts) });
}
