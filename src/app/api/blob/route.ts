/**
 * Ciphertext blob upload/delete for cloud mode (Vercel Blob). The bytes handled
 * here are already AES-GCM ciphertext — the server cannot read them.
 */
import { NextResponse, type NextRequest } from "next/server";
import { putBlobRef, getBlobRef, removeBlobRef } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Blob RW token, tolerant of custom env-var prefixes (Vercel tokens start with vercel_blob_rw_). */
function token() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  return Object.values(process.env).find(
    (v) => typeof v === "string" && v.startsWith("vercel_blob_rw_"),
  );
}

export async function PUT(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  if (!token())
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 501 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const { put } = await import("@vercel/blob");
  const bytes = await req.arrayBuffer();
  const blob = await put(key, bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
    token: token(),
  });
  await putBlobRef(key, blob.url);
  return NextResponse.json({ ok: true, url: blob.url });
}

export async function DELETE(req: NextRequest) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getBlobRef(key);
  if (url) {
    const { del } = await import("@vercel/blob");
    await del(url, { token: token() });
    await removeBlobRef(key);
  }
  return NextResponse.json({ ok: true });
}
