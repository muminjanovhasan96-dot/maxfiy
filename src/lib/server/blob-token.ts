/**
 * Resolve the Vercel Blob read-write token, tolerating two common mistakes:
 *   - surrounding quotes copied from a `.env` line (BLOB_READ_WRITE_TOKEN="…")
 *   - a custom env-var prefix (the value still starts with vercel_blob_rw_)
 * The cleaned value is written back to process.env.BLOB_READ_WRITE_TOKEN so the
 * @vercel/blob SDK (handleUpload/put/del) reads the correct token too.
 */
function clean(v: string): string {
  return v.trim().replace(/^["']+/, "").replace(/["']+$/, "");
}

export function resolveBlobToken(): string | undefined {
  let tk = process.env.BLOB_READ_WRITE_TOKEN;
  if (!tk || !clean(tk).startsWith("vercel_blob_rw_")) {
    tk = Object.values(process.env).find(
      (v) => typeof v === "string" && clean(v).startsWith("vercel_blob_rw_"),
    );
  }
  if (!tk) return undefined;
  const cleaned = clean(tk);
  process.env.BLOB_READ_WRITE_TOKEN = cleaned; // normalize for the SDK
  return cleaned;
}
