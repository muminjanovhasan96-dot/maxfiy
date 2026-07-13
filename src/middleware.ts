/**
 * Per-request Content-Security-Policy with a fresh nonce. This is the strict,
 * dynamic half of the app's security headers (the static ones live in
 * next.config.mjs). The nonce is echoed into a request header so Next.js can
 * stamp it onto its own scripts, and read in the root layout for our inline
 * theme script.
 */
import { NextResponse, type NextRequest } from "next/server";

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function middleware(request: NextRequest) {
  const nonce = makeNonce();
  const isDev = process.env.NODE_ENV !== "production";

  // Hosts the browser talks to for encrypted blobs (cloud mode): Vercel Blob
  // upload + public read endpoints, and optionally Cloudflare R2. Ciphertext only.
  const blobHosts =
    "https://*.vercel-storage.com https://*.r2.cloudflarestorage.com";

  const csp = [
    `default-src 'self'`,
    // 'wasm-unsafe-eval' is required to instantiate the Argon2id WASM module.
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `media-src 'self' blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${blobHosts}`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
