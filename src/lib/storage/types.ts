/**
 * Storage contracts. Two backends implement these:
 *   - IndexedDB (default) — everything stays on the device. Zero server exposure.
 *   - Cloud (Vercel Blob + Postgres) — server stores only ciphertext + wrapped keys.
 *
 * The UI never touches these directly; it goes through VaultRepository, which
 * encrypts on write and decrypts on read using the in-memory master key.
 */
import type { SealedBytes, StreamMeta, VaultHeader } from "@/lib/crypto";

export type ItemType =
  | "photo"
  | "video"
  | "contact"
  | "note"
  | "password"
  | "document";

/** A single vault entry as persisted. Everything sensitive is inside `sealedMeta`. */
export interface StoredItem {
  id: string;
  type: ItemType;
  /** AES-GCM-sealed JSON of ItemMeta (names, dimensions, note bodies, contact fields…). */
  sealedMeta: SealedBytes;
  /** The item DEK, wrapped by the master key. */
  wrappedDek: SealedBytes;

  /** Encrypted content blob (media / documents) — key into the BlobStore. */
  blobKey?: string;
  streamMeta?: StreamMeta;

  /** Encrypted thumbnail blob — key into the BlobStore. */
  thumbKey?: string;

  favorite: boolean;
  /** Soft-delete timestamp for Trash; null = live. */
  deletedAt: number | null;
  albumId?: string | null;

  /**
   * Sort/group key (capture time for media, creation time otherwise). In cloud
   * mode this is stored in plaintext to allow efficient server-side pagination
   * and date grouping — a deliberate, documented metadata trade-off. Content,
   * names and all other fields remain encrypted. In local mode nothing leaves
   * the device at all.
   */
  sortKey: number;

  createdAt: number;
  updatedAt: number;
}

/** Decrypted, in-memory shape of an item's metadata (the plaintext of sealedMeta). */
export interface ItemMeta {
  name?: string;
  mime?: string;
  size?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  avgColor?: string;
  capturedAt?: number;
  tags?: string[];

  contact?: {
    firstName: string;
    lastName?: string;
    company?: string;
    phones: { label: string; value: string }[];
    emails: { label: string; value: string }[];
    notes?: string;
  };

  note?: { title: string; body: string };

  password?: {
    title: string;
    username?: string;
    password: string;
    url?: string;
    notes?: string;
  };

  document?: { fileName: string };
}

/**
 * Lightweight projection of a StoredItem used to build large timelines (100k+)
 * without loading every encrypted-metadata blob into memory. Carries just enough
 * to render + decrypt a thumbnail cell: the wrapped DEK and the thumb/blob keys.
 */
export interface ItemStub {
  id: string;
  type: ItemType;
  sortKey: number;
  favorite: boolean;
  deletedAt: number | null;
  albumId?: string | null;
  wrappedDek: SealedBytes;
  thumbKey?: string;
  blobKey?: string;
  streamMeta?: StreamMeta;
}

export interface ListOptions {
  type?: ItemType | ItemType[];
  favorite?: boolean;
  /** true = only trashed, false = only live, undefined = both. */
  trashed?: boolean;
  albumId?: string | null;
  /** Keyset pagination: return items with sortKey strictly less than this. */
  beforeSortKey?: number;
  limit?: number;
  /** "desc" (newest first, default) or "asc". */
  order?: "asc" | "desc";
}

export interface MetadataStore {
  getHeader(): Promise<VaultHeader | null>;
  putHeader(header: VaultHeader): Promise<void>;

  /** Lightweight list for large timelines (photos/videos). */
  listStubs(opts?: ListOptions): Promise<ItemStub[]>;
  /** Full list including encrypted metadata — use for smaller sections. */
  listItems(opts?: ListOptions): Promise<StoredItem[]>;
  getItem(id: string): Promise<StoredItem | null>;
  putItem(item: StoredItem): Promise<void>;
  removeItem(id: string): Promise<void>;
  count(opts?: ListOptions): Promise<number>;
}

export interface BlobStore {
  put(key: string, data: Blob): Promise<void>;
  /** Fetch the encrypted blob bytes (local: from IndexedDB; cloud: via signed URL). */
  get(key: string): Promise<Blob | null>;
  remove(key: string): Promise<void>;
}

export interface StorageBackend {
  readonly kind: "local" | "cloud";
  metadata: MetadataStore;
  blobs: BlobStore;
}
