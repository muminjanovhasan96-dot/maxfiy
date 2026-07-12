/**
 * Decrypted-thumbnail cache for a smooth 100k+ gallery.
 *
 * Two tiers:
 *   - in-memory object-URL map (LRU by count) for instant re-display while scrolling
 *   - IndexedDB blob cache (LRU by access time, capped) so thumbnails survive reload
 *     without re-fetching + re-decrypting.
 *
 * Note: this stores DECRYPTED thumbnail bytes on-device (behind OS disk encryption
 * and the app's auto-lock). Call `clearMemory()` on lock; `clearPersistent()` wipes
 * the on-disk cache entirely. The originals + full-res assets always stay encrypted.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "maxfiy-thumbs";
const DB_VERSION = 1;
const MEM_MAX = 900; // object URLs kept alive at once
const DISK_MAX = 6000; // decrypted thumbnails persisted
const EVICT_BATCH = 600;

interface ThumbDB extends DBSchema {
  thumbs: {
    key: string;
    value: { blob: Blob; at: number };
    indexes: { by_at: number };
  };
}

let dbPromise: Promise<IDBPDatabase<ThumbDB>> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ThumbDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("thumbs");
        store.createIndex("by_at", "at");
      },
    });
  }
  return dbPromise;
}

class ThumbCache {
  private mem = new Map<string, string>(); // id -> object URL (Map preserves insertion order for LRU)
  private clock = 0;

  private touchMem(id: string, url: string) {
    if (this.mem.has(id)) this.mem.delete(id);
    this.mem.set(id, url);
    while (this.mem.size > MEM_MAX) {
      const oldest = this.mem.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      const oldUrl = this.mem.get(oldest);
      this.mem.delete(oldest);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
    }
  }

  /** Monotonic-ish timestamp without Date.now (kept stable & side-effect free). */
  private now(): number {
    // performance.now is allowed and monotonic; combine with a counter for ties.
    return Math.floor(performance.now() * 1000) + this.clock++;
  }

  async get(id: string): Promise<string | null> {
    const cached = this.mem.get(id);
    if (cached) {
      this.touchMem(id, cached);
      return cached;
    }
    const db = await getDB();
    const rec = await db.get("thumbs", id);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    this.touchMem(id, url);
    // refresh access time (best-effort)
    void db.put("thumbs", { blob: rec.blob, at: this.now() }, id);
    return url;
  }

  /** Store a freshly decrypted thumbnail. Returns a ready-to-use object URL. */
  async put(id: string, blob: Blob): Promise<string> {
    const url = URL.createObjectURL(blob);
    this.touchMem(id, url);
    const db = await getDB();
    await db.put("thumbs", { blob, at: this.now() }, id);
    await this.maybeEvict(db);
    return url;
  }

  private async maybeEvict(db: IDBPDatabase<ThumbDB>) {
    const count = await db.count("thumbs");
    if (count <= DISK_MAX) return;
    const tx = db.transaction("thumbs", "readwrite");
    let cursor = await tx.store.index("by_at").openCursor();
    let removed = 0;
    while (cursor && removed < EVICT_BATCH) {
      await cursor.delete();
      removed++;
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  /** Revoke in-memory object URLs (call on lock / navigation away from gallery). */
  clearMemory() {
    for (const url of this.mem.values()) URL.revokeObjectURL(url);
    this.mem.clear();
  }

  async clearPersistent() {
    this.clearMemory();
    const db = await getDB();
    await db.clear("thumbs");
  }
}

export const thumbCache = new ThumbCache();
