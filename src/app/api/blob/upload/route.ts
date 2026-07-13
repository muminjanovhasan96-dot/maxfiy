/**
 * Issues a short-lived client upload token so the browser can PUT encrypted blobs
 * DIRECTLY to Vercel Blob — bypassing the 4.5 MB serverless request-body limit.
 * The bytes are ciphertext; the server never sees plaintext. Gated by the owner
 * session. See remote.ts RemoteBlobStore.put for the client side.
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { hasValidSession } from "@/lib/server/session";
import { putBlobRef } from "@/lib/server/db";

export const runtime = "nodejs";

function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  return Object.values(process.env).find(
    (v) => typeof v === "string" && v.startsWith("vercel_blob_rw_"),
  );
}

export async function POST(req: NextRequest) {
  // Ensure the SDK can read the token even under a custom env-var prefix.
  const token = blobToken();
  if (token && !process.env.BLOB_READ_WRITE_TOKEN) {
    process.env.BLOB_READ_WRITE_TOKEN = token;
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!(await hasValidSession(req))) throw new Error("Unauthorized");
        return {
          allowedContentTypes: ["application/octet-stream"],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 1024 * 1024 * 1024, // 1 GB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Fires in production (Vercel calls back). The client also records the
        // mapping for local/dev robustness.
        await putBlobRef(blob.pathname, blob.url);
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
