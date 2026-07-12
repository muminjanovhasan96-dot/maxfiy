import { NextResponse, type NextRequest } from "next/server";
import { getItem, putItem, removeItem } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";
import type { StoredItem } from "@/lib/storage/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const { id } = await params;
  return NextResponse.json({ item: await getItem(id) });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  await params; // id is inside the item body
  const { item } = (await req.json()) as { item: StoredItem };
  await putItem(item);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const unauth = await requireSession(req);
  if (unauth) return unauth;
  const { id } = await params;
  await removeItem(id);
  return NextResponse.json({ ok: true });
}
