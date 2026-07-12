/**
 * Vault header endpoint.
 *   GET  — public. The header holds only KDF salts, the wrapped (ciphertext)
 *          master key, and a public auth verifier — nothing secret. A device must
 *          read it before it can derive keys and log in.
 *   PUT  — allowed with no session ONLY when no vault exists yet (first-run
 *          bootstrap). Once a header exists, updating it (e.g. password change)
 *          requires a valid owner session.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cloudConfigured, getHeader, putHeader } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";
import type { VaultHeader } from "@/lib/crypto";

export const runtime = "nodejs";

function guardConfig() {
  if (!cloudConfigured())
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 501 });
  return null;
}

export async function GET() {
  const bad = guardConfig();
  if (bad) return bad;
  return NextResponse.json({ header: await getHeader() });
}

export async function PUT(req: NextRequest) {
  const bad = guardConfig();
  if (bad) return bad;

  const existing = await getHeader();
  if (existing) {
    const unauth = await requireSession(req);
    if (unauth) return unauth;
  }
  const { header } = (await req.json()) as { header: VaultHeader };
  await putHeader(header);
  return NextResponse.json({ ok: true });
}
