/**
 * Cloud backend (client side). Talks to this app's own API routes, which persist
 * ONLY ciphertext + wrapped keys (Postgres for metadata, Vercel Blob for blobs).
 * The server can never read vault content. Requests carry the owner session
 * cookie established at /api/session.
 *
 * Enable by setting NEXT_PUBLIC_STORAGE=cloud (see src/lib/storage/index.ts).
 */
import type { VaultHeader } from "@/lib/crypto";
import type {
  BlobStore,
  ItemStub,
  ListOptions,
  MetadataStore,
  StorageBackend,
  StoredItem,
} from "./types";

/**
 * Open an owner session by presenting the master-key-derived auth key. The server
 * verifies it against the public header verifier and sets an httpOnly cookie.
 */
export async function establishCloudSession(authKeyB64: string): Promise<void> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ authKey: authKeyB64 }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloud sign-in failed (${res.status}): ${body}`);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Storage request failed (${res.status}): ${body}`);
  }
  return (await res.json()) as T;
}

function query(opts: ListOptions = {}): string {
  const p = new URLSearchParams();
  if (opts.type) p.set("type", Array.isArray(opts.type) ? opts.type.join(",") : opts.type);
  if (opts.favorite !== undefined) p.set("favorite", String(opts.favorite));
  if (opts.trashed !== undefined) p.set("trashed", String(opts.trashed));
  if (opts.albumId !== undefined) p.set("albumId", String(opts.albumId));
  if (opts.beforeSortKey !== undefined) p.set("before", String(opts.beforeSortKey));
  if (opts.limit !== undefined) p.set("limit", String(opts.limit));
  if (opts.order) p.set("order", opts.order);
  return p.toString();
}

class RemoteMetadataStore implements MetadataStore {
  async getHeader(): Promise<VaultHeader | null> {
    const { header } = await api<{ header: VaultHeader | null }>("/api/meta/header");
    return header;
  }
  async putHeader(header: VaultHeader): Promise<void> {
    await api("/api/meta/header", { method: "PUT", body: JSON.stringify({ header }) });
  }
  async listStubs(opts?: ListOptions): Promise<ItemStub[]> {
    const { stubs } = await api<{ stubs: ItemStub[] }>(`/api/meta/stubs?${query(opts)}`);
    return stubs;
  }
  async listItems(opts?: ListOptions): Promise<StoredItem[]> {
    const { items } = await api<{ items: StoredItem[] }>(`/api/meta?${query(opts)}`);
    return items;
  }
  async getItem(id: string): Promise<StoredItem | null> {
    const { item } = await api<{ item: StoredItem | null }>(`/api/meta/${id}`);
    return item;
  }
  async putItem(item: StoredItem): Promise<void> {
    await api(`/api/meta/${item.id}`, { method: "PUT", body: JSON.stringify({ item }) });
  }
  async removeItem(id: string): Promise<void> {
    await api(`/api/meta/${id}`, { method: "DELETE" });
  }
  async count(opts?: ListOptions): Promise<number> {
    const { count } = await api<{ count: number }>(`/api/meta/count?${query(opts)}`);
    return count;
  }
}

class RemoteBlobStore implements BlobStore {
  async put(key: string, data: Blob): Promise<void> {
    // Upload the ciphertext DIRECTLY to Vercel Blob (bypasses the 4.5 MB
    // serverless body limit), then record the key -> url mapping on the server.
    const { upload } = await import("@vercel/blob/client");
    const result = await upload(key, data, {
      access: "public",
      contentType: "application/octet-stream",
      handleUploadUrl: "/api/blob/upload",
    });
    const res = await fetch(`/api/blob?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ url: result.url }),
    });
    if (!res.ok) throw new Error(`Blob mapping failed (${res.status})`);
  }
  async get(key: string): Promise<Blob | null> {
    // Time-limited signed URL; the browser fetches the ciphertext and decrypts locally.
    const res = await fetch(`/api/blob/download-url?key=${encodeURIComponent(key)}`, {
      credentials: "same-origin",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Blob URL request failed (${res.status})`);
    const { downloadUrl } = (await res.json()) as { downloadUrl: string };
    const blobRes = await fetch(downloadUrl);
    if (blobRes.status === 404) return null;
    if (!blobRes.ok) throw new Error(`Blob download failed (${blobRes.status})`);
    return blobRes.blob();
  }
  async remove(key: string): Promise<void> {
    await api(`/api/blob?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  }
}

export function createCloudBackend(): StorageBackend {
  return {
    kind: "cloud",
    metadata: new RemoteMetadataStore(),
    blobs: new RemoteBlobStore(),
  };
}
