/**
 * Cloud-mode owner session. POST the access code to receive a signed httpOnly
 * cookie; DELETE to sign out. Not used in the default local mode.
 */
import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, mintSessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const code = process.env.OWNER_ACCESS_CODE;
  if (!code) {
    return NextResponse.json({ error: "Cloud auth not configured" }, { status: 501 });
  }
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  if (!body.code || body.code !== code) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  await mintSessionCookie(res);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
