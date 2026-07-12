/**
 * Backend selection. Default is fully local (IndexedDB) so the app runs with zero
 * external setup. Set NEXT_PUBLIC_STORAGE=cloud to use the Vercel Blob + Postgres
 * backend for a deployed, multi-device vault. Either way the crypto is identical
 * and the server only ever sees ciphertext.
 */
import { createLocalBackend } from "./indexeddb";
import { createCloudBackend } from "./remote";
import type { StorageBackend } from "./types";

let backend: StorageBackend | null = null;

export function getBackend(): StorageBackend {
  if (backend) return backend;
  const mode = process.env.NEXT_PUBLIC_STORAGE;
  backend = mode === "cloud" ? createCloudBackend() : createLocalBackend();
  return backend;
}

export * from "./types";
export { thumbCache } from "./thumb-cache";
