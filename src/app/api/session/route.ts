/**
 * Cloud-mode owner session. The client proves knowledge of the passwords by
 * presenting an auth key derived from the (client-only) master key. The server
 * compares it against the public verifier stored in the vault header and, on
 * success, mints a signed httpOnly session cookie. No separate access code and
 * no password ever reaches the server.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cloudConfigured, getHeader } from "@/lib/server/db";
import { verifyAuthKeyB64 } from "@/lib/crypto/envelope";
import { clearSessionCookie, mintSessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!cloudConfigured()) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 501 });
  }
  const body = (await req.json().catch(() => ({}))) as { authKey?: string };
  if (!body.authKey) {
    return NextResponse.json({ error: "Missing auth key" }, { status: 400 });
  }
  const header = await getHeader();
  if (!header?.authHash) {
    return NextResponse.json({ error: "No vault exists yet" }, { status: 404 });
  }
  const ok = await verifyAuthKeyB64(body.authKey, header.authHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
