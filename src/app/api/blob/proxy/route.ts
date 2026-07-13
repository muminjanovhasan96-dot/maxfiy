/**
 * Streams a PRIVATE encrypted blob back to the owner. Private-store blobs can
 * only be read with the RW token (server-side), so the browser fetches them
 * through here. The bytes streamed are AES-GCM ciphertext — the server can't
 * read them; it only relays them. Session-gated. Response is streamed, so there
 * is no size limit (unlike the 4.5 MB request-body limit on uploads).
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/session";
import { getBlobRef } from "@/lib/server/db";
import { resolveBlobToken } from "@/lib/server/blob-token";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getBlobRef(key);
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = resolveBlobToken();
  const upstream = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }
  return new Response(upstream.body, {
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
