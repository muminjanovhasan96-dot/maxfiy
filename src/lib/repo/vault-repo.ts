/**
 * VaultRepository — the single client-side API the UI uses. It owns the in-memory
 * master key and performs encrypt-on-write / decrypt-on-read against the storage
 * backend. Nothing here talks to the network except through the storage backend,
 * and only ciphertext ever crosses that boundary.
 */
import {
  decryptItem,
  fromUtf8,
  openRawBlob,
  seal,
  sealRawToBlob,
  unwrapDek,
  utf8,
  decryptToBlob,
  encryptFileToBlob,
  generateDek,
  wrapDek,
  type SealedBytes,
  type StreamMeta,
} from "@/lib/crypto";
import {
  compressImage,
  generateImageThumbnail,
  generateVideoThumbnail,
  placeholderThumbnail,
} from "@/lib/crypto/thumbnails";
import { getBackend, thumbCache } from "@/lib/storage";
import type {
  ItemMeta,
  ItemStub,
  ItemType,
  ListOptions,
  StorageBackend,
  StoredItem,
} from "@/lib/storage/types";

export interface DecryptedItem {
  stub: ItemStub;
  item: StoredItem;
  meta: ItemMeta;
}

function newId(): string {
  return crypto.randomUUID();
}

export class VaultRepository {
  private metaCache = new Map<string, ItemMeta>();

  constructor(
    private masterKey: Uint8Array,
    private backend: StorageBackend = getBackend(),
  ) {}

  get storageKind() {
    return this.backend.kind;
  }

  // ---- metadata (de)serialization -------------------------------------------

  private async sealMeta(dek: Uint8Array, meta: ItemMeta): Promise<SealedBytes> {
    return seal(dek, utf8(JSON.stringify(meta)));
  }

  async decryptMeta(item: StoredItem): Promise<ItemMeta> {
    const cached = this.metaCache.get(item.id);
    if (cached) return cached;
    const bytes = await decryptItem(this.masterKey, item.sealedMeta, item.wrappedDek);
    const meta = JSON.parse(fromUtf8(bytes)) as ItemMeta;
    this.metaCache.set(item.id, meta);
    return meta;
  }

  // ---- thumbnails -----------------------------------------------------------

  /** Returns an object URL for the decrypted thumbnail, using the two-tier cache. */
  async getThumbUrl(stub: ItemStub): Promise<string | null> {
    if (!stub.thumbKey) return null;
    const cached = await thumbCache.get(stub.id);
    if (cached) return cached;
    const blob = await this.backend.blobs.get(stub.thumbKey);
    if (!blob) return null;
    const dek = await unwrapDek(this.masterKey, stub.wrappedDek);
    const bytes = await openRawBlob(dek, blob);
    const thumbBlob = new Blob([bytes], { type: "image/webp" });
    return thumbCache.put(stub.id, thumbBlob);
  }

  // ---- full media -----------------------------------------------------------

  /** Decrypt the full-resolution asset into an object URL (image/video/pdf…). */
  async getAssetUrl(item: StoredItem): Promise<string> {
    if (!item.blobKey || !item.streamMeta) {
      throw new Error("Item has no stored asset");
    }
    const meta = await this.decryptMeta(item);
    const enc = await this.backend.blobs.get(item.blobKey);
    if (!enc) throw new Error("Encrypted asset not found in storage");
    const dek = await unwrapDek(this.masterKey, item.wrappedDek);
    const blob = await decryptToBlob(
      dek,
      enc,
      item.streamMeta,
      meta.mime || "application/octet-stream",
    );
    return URL.createObjectURL(blob);
  }

  async getAssetBlob(item: StoredItem): Promise<Blob> {
    const url = await this.getAssetUrl(item);
    const blob = await (await fetch(url)).blob();
    URL.revokeObjectURL(url);
    return blob;
  }

  // ---- writes: media --------------------------------------------------------

  async addMedia(
    file: File,
    kind: "photo" | "video",
    onProgress?: (fraction: number) => void,
  ): Promise<StoredItem> {
    const t0 = performance.now();
    const mark = (label: string) =>
      console.log(`[upload:${file.name}] ${label} @ ${(performance.now() - t0).toFixed(0)}ms`);
    const dek = generateDek();
    onProgress?.(0.05);

    // Thumbnail generation must never block the upload — some formats (e.g. HEIC)
    // can't be decoded by the browser, so fall back to a placeholder.
    let thumb;
    try {
      thumb =
        kind === "photo"
          ? await generateImageThumbnail(file)
          : await generateVideoThumbnail(file);
    } catch (err) {
      console.warn("Thumbnail generation failed; using placeholder:", err);
      thumb = await placeholderThumbnail();
    }
    mark("thumbnail-done");
    onProgress?.(0.2);

    // Downscale big photos so they upload fast over mobile networks.
    let content: Blob = file;
    let mime = file.type || (kind === "photo" ? "image/jpeg" : "video/mp4");
    if (kind === "photo") {
      try {
        const compressed = await compressImage(file);
        if (compressed !== file) {
          content = compressed;
          mime = "image/jpeg";
        }
      } catch {
        /* keep original */
      }
    }
    mark(`compressed (${(content.size / 1024).toFixed(0)}KB)`);

    const { blob: encBlob, meta: streamMeta } = await encryptFileToBlob(dek, content);
    const encThumb = await sealRawToBlob(dek, new Uint8Array(await thumb.blob.arrayBuffer()));
    mark("encrypted");
    onProgress?.(0.35);

    const id = newId();
    const blobKey = `content/${id}`;
    const thumbKey = `thumb/${id}`;
    // Upload the full asset and its thumbnail concurrently.
    await Promise.all([
      this.backend.blobs.put(blobKey, encBlob),
      this.backend.blobs.put(thumbKey, encThumb),
    ]);
    mark("uploaded");
    onProgress?.(0.9);

    const capturedAt = file.lastModified || Date.now();
    const meta: ItemMeta = {
      name: file.name,
      mime,
      size: content.size,
      width: thumb.width,
      height: thumb.height,
      avgColor: thumb.avgColor,
      capturedAt,
      durationMs: (thumb as Partial<{ durationMs: number }>).durationMs,
    };

    const item = await this.persistItem({
      id,
      type: kind,
      meta,
      dek,
      blobKey,
      streamMeta,
      thumbKey,
      sortKey: capturedAt,
    });
    onProgress?.(1);
    return item;
  }

  async addDocument(file: File): Promise<StoredItem> {
    const dek = generateDek();
    const { blob: encBlob, meta: streamMeta } = await encryptFileToBlob(dek, file);
    const id = newId();
    const blobKey = `content/${id}`;
    await this.backend.blobs.put(blobKey, encBlob);
    const now = Date.now();
    const meta: ItemMeta = {
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      capturedAt: file.lastModified || now,
      document: { fileName: file.name },
    };
    return this.persistItem({
      id,
      type: "document",
      meta,
      dek,
      blobKey,
      streamMeta,
      sortKey: file.lastModified || now,
    });
  }

  // ---- writes: text records -------------------------------------------------

  async addContact(contact: NonNullable<ItemMeta["contact"]>): Promise<StoredItem> {
    const name = `${contact.firstName} ${contact.lastName ?? ""}`.trim();
    return this.addTextItem("contact", { name, contact });
  }
  async addNote(note: NonNullable<ItemMeta["note"]>): Promise<StoredItem> {
    return this.addTextItem("note", { name: note.title, note });
  }
  async addPassword(password: NonNullable<ItemMeta["password"]>): Promise<StoredItem> {
    return this.addTextItem("password", { name: password.title, password });
  }

  private async addTextItem(type: ItemType, meta: ItemMeta): Promise<StoredItem> {
    const dek = generateDek();
    const now = Date.now();
    return this.persistItem({ id: newId(), type, meta, dek, sortKey: now });
  }

  async updateItem(id: string, patch: Partial<ItemMeta>): Promise<StoredItem> {
    const existing = await this.backend.metadata.getItem(id);
    if (!existing) throw new Error("Item not found");
    const current = await this.decryptMeta(existing);
    const merged = { ...current, ...patch };
    const dek = await unwrapDek(this.masterKey, existing.wrappedDek);
    const sealedMeta = await this.sealMeta(dek, merged);
    const updated: StoredItem = { ...existing, sealedMeta, updatedAt: Date.now() };
    await this.backend.metadata.putItem(updated);
    this.metaCache.set(id, merged);
    return updated;
  }

  // ---- shared persist -------------------------------------------------------

  private async persistItem(input: {
    id: string;
    type: ItemType;
    meta: ItemMeta;
    dek: Uint8Array;
    blobKey?: string;
    streamMeta?: StreamMeta;
    thumbKey?: string;
    sortKey: number;
  }): Promise<StoredItem> {
    const now = Date.now();
    const sealedMeta = await this.sealMeta(input.dek, input.meta);
    const wrappedDek = await wrapDek(this.masterKey, input.dek);
    const item: StoredItem = {
      id: input.id,
      type: input.type,
      sealedMeta,
      wrappedDek,
      blobKey: input.blobKey,
      streamMeta: input.streamMeta,
      thumbKey: input.thumbKey,
      favorite: false,
      deletedAt: null,
      albumId: null,
      sortKey: input.sortKey,
      createdAt: now,
      updatedAt: now,
    };
    await this.backend.metadata.putItem(item);
    this.metaCache.set(item.id, input.meta);
    return item;
  }

  // ---- reads ----------------------------------------------------------------

  listStubs(opts?: ListOptions) {
    return this.backend.metadata.listStubs(opts);
  }
  listItems(opts?: ListOptions) {
    return this.backend.metadata.listItems(opts);
  }
  getItem(id: string) {
    return this.backend.metadata.getItem(id);
  }
  count(opts?: ListOptions) {
    return this.backend.metadata.count(opts);
  }

  /** Full decrypted list for smaller sections (contacts/notes/passwords/docs). */
  async listDecrypted(opts?: ListOptions): Promise<DecryptedItem[]> {
    const items = await this.backend.metadata.listItems(opts);
    const out: DecryptedItem[] = [];
    for (const item of items) {
      const meta = await this.decryptMeta(item);
      out.push({ stub: stubOf(item), item, meta });
    }
    return out;
  }

  // ---- mutations ------------------------------------------------------------

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const item = await this.backend.metadata.getItem(id);
    if (!item) return;
    await this.backend.metadata.putItem({ ...item, favorite, updatedAt: Date.now() });
  }

  async trash(id: string): Promise<void> {
    const item = await this.backend.metadata.getItem(id);
    if (!item) return;
    await this.backend.metadata.putItem({
      ...item,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async restore(id: string): Promise<void> {
    const item = await this.backend.metadata.getItem(id);
    if (!item) return;
    await this.backend.metadata.putItem({ ...item, deletedAt: null, updatedAt: Date.now() });
  }

  async deletePermanently(id: string): Promise<void> {
    const item = await this.backend.metadata.getItem(id);
    if (!item) return;
    if (item.blobKey) await this.backend.blobs.remove(item.blobKey).catch(() => {});
    if (item.thumbKey) await this.backend.blobs.remove(item.thumbKey).catch(() => {});
    await this.backend.metadata.removeItem(id);
    this.metaCache.delete(id);
  }

  /** Zeroes the in-memory master key reference and clears caches (call on lock). */
  dispose() {
    this.metaCache.clear();
    thumbCache.clearMemory();
    this.masterKey.fill(0);
  }
}

function stubOf(item: StoredItem): ItemStub {
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
