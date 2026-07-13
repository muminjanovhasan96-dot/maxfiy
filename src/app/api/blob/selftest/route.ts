/**
 * TEMPORARY diagnostic: uploads a PRIVATE blob and records its mapping so a
 * follow-up GET /api/blob/proxy?key=<key> can verify the read path. Remove after
 * debugging. Session-gated.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/session";
import { resolveBlobToken } from "@/lib/server/blob-token";
import { putBlobRef } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  resolveBlobToken();
  try {
    const { put } = await import("@vercel/blob");
    const key = `selftest/${crypto.randomUUID()}`;
    const data = new Uint8Array([9, 8, 7, 6, 5]);
    const r = await put(key, data, {
      access: "private",
      contentType: "application/octet-stream",
    });
    await putBlobRef(key, r.url);
    return NextResponse.json({ ok: true, key, url: r.url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
