/**
 * Blob mapping + delete for cloud mode.
 *   PUT    — record a key -> url mapping after the client uploaded the ciphertext
 *            directly to Vercel Blob (see /api/blob/upload).
 *   DELETE — remove the blob and its mapping.
 * The bytes themselves never pass through here; only the (public, unguessable)
 * URL of already-encrypted content.
 */
import { NextResponse, type NextRequest } from "next/server";
import { putBlobRef, getBlobRef, removeBlobRef } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";

export const runtime = "nodejs";

function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  return Object.values(process.env).find(
    (v) => typeof v === "string" && v.startsWith("vercel_blob_rw_"),
  );
}

export async function PUT(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  await putBlobRef(key, url);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getBlobRef(key);
  if (url) {
    const { del } = await import("@vercel/blob");
    await del(url, { token: blobToken() });
    await removeBlobRef(key);
  }
  return NextResponse.json({ ok: true });
}
