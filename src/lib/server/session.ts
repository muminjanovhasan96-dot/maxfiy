/**
 * Owner session for CLOUD mode only. Because the E2EE passwords never reach the
 * server, cloud deployments gate API access with a separate short "access code"
 * (OWNER_ACCESS_CODE). Proving it once mints a signed, httpOnly session cookie.
 * This protects the ciphertext store from anonymous access; it is NOT what keeps
 * your data secret — the encryption does that, and the server can never decrypt.
 */
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "mx_session";
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

function secret(): string {
  return process.env.SESSION_SECRET ?? "dev-insecure-session-secret-change-me";
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function mintSessionCookie(res: NextResponse): Promise<void> {
  const payload = btoa(JSON.stringify({ exp: Date.now() + TTL_MS }));
  const token = `${payload}.${await hmac(payload)}`;
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if ((await hmac(payload)) !== sig) return false;
  try {
    const { exp } = JSON.parse(atob(payload)) as { exp: number };
    return exp > Date.now();
  } catch {
    return false;
  }
}

/** Returns null when authorized, or a 401 response to short-circuit the handler. */
export async function requireSession(req: NextRequest): Promise<NextResponse | null> {
  if (await hasValidSession(req)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
