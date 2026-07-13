/**
 * TEMPORARY diagnostic: uploads a PRIVATE blob and tests how to read it back.
 * Remove after debugging. Session-gated.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/session";
import { resolveBlobToken } from "@/lib/server/blob-token";

export const runtime = "nodejs";

async function status(p: Promise<Response>): Promise<string> {
  try {
    const r = await p;
    return `${r.status} (${(await r.arrayBuffer()).byteLength}b)`;
  } catch (e) {
    return `ERR ${(e as Error).message.slice(0, 60)}`;
  }
}

export async function GET(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const tk = resolveBlobToken();
  try {
    const { put } = await import("@vercel/blob");
    const data = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    const r = await put(`selftest/${crypto.randomUUID()}`, data, {
      access: "private",
      contentType: "application/octet-stream",
    });
    const anyR = r as unknown as { url: string; downloadUrl?: string };
    const m1_authHeader = await status(
      fetch(anyR.url, { headers: { authorization: `Bearer ${tk}` } }),
    );
    const m2_downloadUrl = anyR.downloadUrl
      ? await status(fetch(anyR.downloadUrl))
      : "no downloadUrl field";
    const m3_plain = await status(fetch(anyR.url));
    return NextResponse.json({
      ok: true,
      url: anyR.url,
      downloadUrl: anyR.downloadUrl ?? null,
      m1_authHeader,
      m2_downloadUrl,
      m3_plain,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
