import { NextResponse, type NextRequest } from "next/server";
import { cloudConfigured, getHeader, putHeader } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";
import type { VaultHeader } from "@/lib/crypto";

export const runtime = "nodejs";

function guardConfig() {
  if (!cloudConfigured())
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 501 });
  return null;
}

export async function GET(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const bad = guardConfig();
  if (bad) return bad;
  return NextResponse.json({ header: await getHeader() });
}

export async function PUT(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const bad = guardConfig();
  if (bad) return bad;
  const { header } = (await req.json()) as { header: VaultHeader };
  await putHeader(header);
  return NextResponse.json({ ok: true });
}
