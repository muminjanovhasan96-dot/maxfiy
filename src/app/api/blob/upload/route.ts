/**
 * Issues a short-lived client upload token so the browser can PUT encrypted blobs
 * DIRECTLY to Vercel Blob — bypassing the 4.5 MB serverless request-body limit.
 * The bytes are ciphertext; the server never sees plaintext. Gated by the owner
 * session. See remote.ts RemoteBlobStore.put for the client side.
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { hasValidSession } from "@/lib/server/session";
import { resolveBlobToken } from "@/lib/server/blob-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Normalize the token (strip stray quotes/whitespace) so handleUpload signs
  // client tokens the Blob API will accept.
  resolveBlobToken();

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
      onUploadCompleted: async () => {
        // No-op: the client records the key->url mapping right after upload().
        // Vercel holds the client's upload open until this callback returns, so
        // doing DB work (or throwing) here would stall/retry the whole upload.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
