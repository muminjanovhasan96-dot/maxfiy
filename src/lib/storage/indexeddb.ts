/**
 * Local IndexedDB backend — the default. Everything (encrypted metadata AND
 * encrypted blobs) lives on the device; nothing is sent to any server. This is
 * the most private option and makes the app runnable with zero external setup.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { VaultHeader } from "@/lib/crypto";
import type {
  BlobStore,
  ItemStub,
  ListOptions,
  MetadataStore,
  StorageBackend,
  StoredItem,
} from "./types";

const DB_NAME = "maxfiy-vault";
const DB_VERSION = 1;
const HEADER_KEY = "singleton";

interface VaultDB extends DBSchema {
  header: { key: string; value: VaultHeader };
  items: {
    key: string;
    value: StoredItem;
    indexes: {
      by_sortKey: number;
      by_type_sortKey: [string, number];
    };
  };
  blobs: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

function getDB(): Promise<IDBPDatabase<VaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("header");
        const items = db.createObjectStore("items", { keyPath: "id" });
        items.createIndex("by_sortKey", "sortKey");
        items.createIndex("by_type_sortKey", ["type", "sortKey"]);
        db.createObjectStore("blobs");
      },
    });
  }
  return dbPromise;
}

function matchesFilters(item: StoredItem, opts: ListOptions): boolean {
  if (opts.trashed === true && item.deletedAt === null) return false;
  if (opts.trashed === false && item.deletedAt !== null) return false;
  if (opts.favorite === true && !item.favorite) return false;
  if (opts.albumId !== undefined && (item.albumId ?? null) !== opts.albumId)
    return false;
  if (opts.type) {
    const types = Array.isArray(opts.type) ? opts.type : [opts.type];
    if (!types.includes(item.type)) return false;
  }
  return true;
}

/** Walk the sortKey index in the requested direction, applying filters + paging. */
async function walk(
  db: IDBPDatabase<VaultDB>,
  opts: ListOptions,
  visit: (item: StoredItem) => void,
): Promise<void> {
  const order = opts.order ?? "desc";
  const direction: IDBCursorDirection = order === "desc" ? "prev" : "next";
  const limit = opts.limit ?? Infinity;

  // Use the type-scoped index when a single type is requested (most selective).
  const singleType =
    typeof opts.type === "string" ? opts.type : undefined;

  let count = 0;
  if (singleType) {
    const idx = db.transaction("items").store.index("by_type_sortKey");
    let range: IDBKeyRange | null = null;
    if (opts.beforeSortKey !== undefined) {
      range =
        order === "desc"
          ? IDBKeyRange.bound(
              [singleType, -Infinity],
              [singleType, opts.beforeSortKey],
              false,
              true,
            )
          : IDBKeyRange.lowerBound([singleType, opts.beforeSortKey], true);
    } else {
      range = IDBKeyRange.bound(
        [singleType, -Infinity],
        [singleType, Infinity],
      );
    }
    let cursor = await idx.openCursor(range, direction);
    while (cursor && count < limit) {
      const item = cursor.value;
      if (matchesFilters(item, opts)) {
        visit(item);
        count++;
      }
      cursor = await cursor.continue();
    }
    return;
  }

  const idx = db.transaction("items").store.index("by_sortKey");
  let range: IDBKeyRange | null = null;
  if (opts.beforeSortKey !== undefined) {
    range =
      order === "desc"
        ? IDBKeyRange.upperBound(opts.beforeSortKey, true)
        : IDBKeyRange.lowerBound(opts.beforeSortKey, true);
  }
  let cursor = await idx.openCursor(range, direction);
  while (cursor && count < limit) {
    const item = cursor.value;
    if (matchesFilters(item, opts)) {
      visit(item);
      count++;
    }
    cursor = await cursor.continue();
  }
}

function toStub(item: StoredItem): ItemStub {
  return {
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
  };
}

class IdbMetadataStore implements MetadataStore {
  async getHeader(): Promise<VaultHeader | null> {
    const db = await getDB();
    return (await db.get("header", HEADER_KEY)) ?? null;
  }
  async putHeader(header: VaultHeader): Promise<void> {
    const db = await getDB();
    await db.put("header", header, HEADER_KEY);
  }
  async listStubs(opts: ListOptions = {}): Promise<ItemStub[]> {
    const db = await getDB();
    const out: ItemStub[] = [];
    await walk(db, opts, (item) => out.push(toStub(item)));
    return out;
  }
  async listItems(opts: ListOptions = {}): Promise<StoredItem[]> {
    const db = await getDB();
    const out: StoredItem[] = [];
    await walk(db, opts, (item) => out.push(item));
    return out;
  }
  async getItem(id: string): Promise<StoredItem | null> {
    const db = await getDB();
    return (await db.get("items", id)) ?? null;
  }
  async putItem(item: StoredItem): Promise<void> {
    const db = await getDB();
    await db.put("items", item);
  }
  async removeItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("items", id);
  }
  async count(opts: ListOptions = {}): Promise<number> {
    const db = await getDB();
    let n = 0;
    await walk(db, { ...opts, limit: Infinity }, () => {
      n++;
    });
    return n;
  }
}

class IdbBlobStore implements BlobStore {
  async put(key: string, data: Blob): Promise<void> {
    const db = await getDB();
    await db.put("blobs", data, key);
  }
  async get(key: string): Promise<Blob | null> {
    const db = await getDB();
    return (await db.get("blobs", key)) ?? null;
  }
  async remove(key: string): Promise<void> {
    const db = await getDB();
    await db.delete("blobs", key);
  }
}

export function createLocalBackend(): StorageBackend {
  return {
    kind: "local",
    metadata: new IdbMetadataStore(),
    blobs: new IdbBlobStore(),
  };
}

/** Danger: wipes the entire local vault database. Used by "erase this device". */
export async function destroyLocalDatabase(): Promise<void> {
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
