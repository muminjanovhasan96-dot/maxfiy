/**
 * Cloud metadata store (Postgres via Neon). Stores ONLY ciphertext + wrapped keys
 * as JSON, plus a few plaintext columns (type, sort_key, favorite, deleted_at) to
 * enable efficient server-side pagination and date grouping. Content, names, and
 * all sensitive fields remain encrypted inside `data`. The DB driver is imported
 * dynamically so the project builds even without the optional dependency.
 */
import type { VaultHeader } from "@/lib/crypto";
import type { ItemStub, ListOptions, StoredItem } from "@/lib/storage/types";

export function cloudConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
let sqlPromise: Promise<Sql> | null = null;

async function getSql(): Promise<Sql> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!) as unknown as Sql;
      await ensureSchema(sql);
      return sql;
    })();
  }
  return sqlPromise;
}

async function ensureSchema(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS vault_header (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      sort_key DOUBLE PRECISION NOT NULL,
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at BIGINT,
      album_id TEXT,
      data JSONB NOT NULL
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_items_type_sort ON vault_items(type, sort_key DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_items_sort ON vault_items(sort_key DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS vault_blobs (
      key TEXT PRIMARY KEY,
      url TEXT NOT NULL
    )`;
}

// --- blob reference map (key -> Vercel Blob url) -----------------------------

export async function putBlobRef(key: string, url: string): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO vault_blobs (key, url) VALUES (${key}, ${url})
    ON CONFLICT (key) DO UPDATE SET url = EXCLUDED.url`;
}

export async function getBlobRef(key: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql`SELECT url FROM vault_blobs WHERE key = ${key}`;
  return rows[0] ? (rows[0].url as string) : null;
}

export async function removeBlobRef(key: string): Promise<void> {
  const sql = await getSql();
  await sql`DELETE FROM vault_blobs WHERE key = ${key}`;
}

export async function getHeader(): Promise<VaultHeader | null> {
  const sql = await getSql();
  const rows = await sql`SELECT data FROM vault_header WHERE id = 1`;
  return rows[0] ? (rows[0].data as VaultHeader) : null;
}

export async function putHeader(header: VaultHeader): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO vault_header (id, data) VALUES (1, ${JSON.stringify(header)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
}

// Filtering is applied in SQL where cheap, and refined in JS for the rest.
function passesJsFilters(item: StoredItem, opts: ListOptions): boolean {
  if (opts.favorite === true && !item.favorite) return false;
  if (opts.albumId !== undefined && (item.albumId ?? null) !== opts.albumId) return false;
  if (opts.type) {
    const types = Array.isArray(opts.type) ? opts.type : [opts.type];
    if (!types.includes(item.type)) return false;
  }
  return true;
}

async function queryItems(opts: ListOptions): Promise<StoredItem[]> {
  const sql = await getSql();
  const order = opts.order ?? "desc";
  const limit = opts.limit ?? 100000;
  const before = opts.beforeSortKey;
  const trashedOnly = opts.trashed === true;
  const liveOnly = opts.trashed === false;

  // Neon's tagged template safely parameterizes interpolations.
  const rows = order === "desc"
    ? await sql`
        SELECT data FROM vault_items
        WHERE (${before === undefined} OR sort_key < ${before ?? 0})
          AND (${!trashedOnly} OR deleted_at IS NOT NULL)
          AND (${!liveOnly} OR deleted_at IS NULL)
        ORDER BY sort_key DESC
        LIMIT ${limit}`
    : await sql`
        SELECT data FROM vault_items
        WHERE (${before === undefined} OR sort_key > ${before ?? 0})
          AND (${!trashedOnly} OR deleted_at IS NOT NULL)
          AND (${!liveOnly} OR deleted_at IS NULL)
        ORDER BY sort_key ASC
        LIMIT ${limit}`;

  return rows
    .map((r) => r.data as StoredItem)
    .filter((it) => passesJsFilters(it, opts));
}

export async function listItems(opts: ListOptions = {}): Promise<StoredItem[]> {
  return queryItems(opts);
}

export async function listStubs(opts: ListOptions = {}): Promise<ItemStub[]> {
  const items = await queryItems(opts);
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    sortKey: item.sortKey,
    favorite: item.favorite,
    deletedAt: item.deletedAt,
    albumId: item.albumId ?? null,
    wrappedDek: item.wrappedDek,
    thumbKey: item.thumbKey,
    blobKey: item.blobKey,
    streamMeta: item.streamMeta,
  }));
}

export async function getItem(id: string): Promise<StoredItem | null> {
  const sql = await getSql();
  const rows = await sql`SELECT data FROM vault_items WHERE id = ${id}`;
  return rows[0] ? (rows[0].data as StoredItem) : null;
}

export async function putItem(item: StoredItem): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO vault_items (id, type, sort_key, favorite, deleted_at, album_id, data)
    VALUES (${item.id}, ${item.type}, ${item.sortKey}, ${item.favorite},
            ${item.deletedAt}, ${item.albumId ?? null}, ${JSON.stringify(item)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type, sort_key = EXCLUDED.sort_key, favorite = EXCLUDED.favorite,
      deleted_at = EXCLUDED.deleted_at, album_id = EXCLUDED.album_id, data = EXCLUDED.data`;
}

export async function removeItem(id: string): Promise<void> {
  const sql = await getSql();
  await sql`DELETE FROM vault_items WHERE id = ${id}`;
}

export async function count(opts: ListOptions = {}): Promise<number> {
  const items = await queryItems({ ...opts, limit: undefined });
  return items.length;
}

/** Parse ListOptions from an API route's query string. */
export function parseListOptions(sp: URLSearchParams): ListOptions {
  const opts: ListOptions = {};
  const type = sp.get("type");
  if (type) opts.type = type.includes(",") ? (type.split(",") as ListOptions["type"]) : (type as ListOptions["type"]);
  if (sp.has("favorite")) opts.favorite = sp.get("favorite") === "true";
  if (sp.has("trashed")) opts.trashed = sp.get("trashed") === "true";
  if (sp.has("albumId")) opts.albumId = sp.get("albumId");
  if (sp.has("before")) opts.beforeSortKey = Number(sp.get("before"));
  if (sp.has("limit")) opts.limit = Number(sp.get("limit"));
  const order = sp.get("order");
  if (order === "asc" || order === "desc") opts.order = order;
  return opts;
}
