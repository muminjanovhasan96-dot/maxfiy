/**
 * Server-enforced brute-force lockout. Keyed by (client IP + device cookie) so a
 * page refresh, new tab, or cleared client state cannot reset the counter.
 *
 * Backed by Upstash Redis when configured (durable across serverless instances);
 * falls back to an in-memory map for local development. After MAX_ATTEMPTS wrong
 * tries the key is locked for LOCKOUT_MS. The same counter covers both the login
 * and the recovery-word flows.
 */
import { NextResponse, type NextRequest } from "next/server";
import { LOCKOUT_MS, MAX_ATTEMPTS, type LockoutStatus } from "@/lib/auth/policy";

export const runtime = "nodejs";

interface LockState {
  attempts: number;
  lockedUntil: number; // epoch ms; 0 = not locked
}

// --- storage: Upstash if configured, else in-memory (dev only) ----------------

const useUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const memory = new Map<string, LockState>();

async function upstash(command: unknown[]): Promise<unknown> {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN!}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

async function readState(key: string): Promise<LockState> {
  if (useUpstash) {
    const raw = (await upstash(["GET", `lockout:${key}`])) as string | null;
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    try {
      return JSON.parse(raw) as LockState;
    } catch {
      return { attempts: 0, lockedUntil: 0 };
    }
  }
  return memory.get(key) ?? { attempts: 0, lockedUntil: 0 };
}

async function writeState(key: string, state: LockState): Promise<void> {
  if (useUpstash) {
    // Expire the record a bit after any active lock so stale keys clean themselves up.
    const ttl = Math.ceil((LOCKOUT_MS * 2) / 1000);
    await upstash(["SET", `lockout:${key}`, JSON.stringify(state), "EX", ttl]);
    return;
  }
  memory.set(key, state);
}

async function clearState(key: string): Promise<void> {
  if (useUpstash) {
    await upstash(["DEL", `lockout:${key}`]);
    return;
  }
  memory.delete(key);
}

// --- request identity ---------------------------------------------------------

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

function deviceId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get("mx_did")?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: crypto.randomUUID(), isNew: true };
}

function statusFrom(state: LockState, now: number): LockoutStatus {
  if (state.lockedUntil > now) {
    return {
      locked: true,
      remainingMs: state.lockedUntil - now,
      attemptsLeft: 0,
    };
  }
  return {
    locked: false,
    remainingMs: 0,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - state.attempts),
  };
}

function respond(status: LockoutStatus, device: { id: string; isNew: boolean }) {
  const res = NextResponse.json(status);
  if (device.isNew) {
    res.cookies.set("mx_did", device.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

// --- handlers -----------------------------------------------------------------

export async function GET(req: NextRequest) {
  const device = deviceId(req);
  const key = `${clientIp(req)}:${device.id}`;
  const now = Date.now();
  let state = await readState(key);
  // A lapsed lock auto-resets the attempt budget.
  if (state.lockedUntil !== 0 && state.lockedUntil <= now) {
    state = { attempts: 0, lockedUntil: 0 };
    await writeState(key, state);
  }
  return respond(statusFrom(state, now), device);
}

export async function POST(req: NextRequest) {
  const device = deviceId(req);
  const key = `${clientIp(req)}:${device.id}`;
  const now = Date.now();
  const body = (await req.json().catch(() => ({}))) as { result?: string };

  let state = await readState(key);

  // If currently locked, ignore the result and just report the remaining time.
  if (state.lockedUntil > now) {
    return respond(statusFrom(state, now), device);
  }
  // Reset a lapsed lock before processing.
  if (state.lockedUntil !== 0) state = { attempts: 0, lockedUntil: 0 };

  if (body.result === "success") {
    await clearState(key);
    return respond({ locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS }, device);
  }

  // A failed attempt.
  const attempts = state.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    const locked: LockState = { attempts, lockedUntil: now + LOCKOUT_MS };
    await writeState(key, locked);
    return respond(statusFrom(locked, now), device);
  }
  const next: LockState = { attempts, lockedUntil: 0 };
  await writeState(key, next);
  return respond(statusFrom(next, now), device);
}
