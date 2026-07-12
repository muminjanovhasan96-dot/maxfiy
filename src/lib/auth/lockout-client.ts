/** Client helpers for the server-enforced lockout. Thin wrappers over /api/lockout. */
import type { LockoutStatus } from "./policy";

async function call(init?: RequestInit): Promise<LockoutStatus> {
  const res = await fetch("/api/lockout", {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Lockout service error (${res.status})`);
  return (await res.json()) as LockoutStatus;
}

export function getLockoutStatus(): Promise<LockoutStatus> {
  return call({ method: "GET" });
}

export function reportFailure(): Promise<LockoutStatus> {
  return call({ method: "POST", body: JSON.stringify({ result: "fail" }) });
}

export function reportSuccess(): Promise<LockoutStatus> {
  return call({ method: "POST", body: JSON.stringify({ result: "success" }) });
}
