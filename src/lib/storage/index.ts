/**
 * Backend selection. The app auto-detects cloud vs local at runtime by probing
 * /api/config, so cloud mode "just works" whenever the server has a database
 * configured — no build-time flag required. Set NEXT_PUBLIC_STORAGE=local to
 * force fully on-device mode. Either way the server only ever sees ciphertext.
 */
import { createLocalBackend } from "./indexeddb";
import { createCloudBackend } from "./remote";
import type { StorageBackend } from "./types";

let backend: StorageBackend | null = null;
let mode: "local" | "cloud" | null = null;

/** Synchronous accessor. Defaults to local until detectBackend() has run. */
export function getBackend(): StorageBackend {
  if (!backend) backend = createLocalBackend();
  return backend;
}

export function configureBackend(cloud: boolean): StorageBackend {
  const desired: "local" | "cloud" = cloud ? "cloud" : "local";
  if (mode !== desired || !backend) {
    mode = desired;
    backend = cloud ? createCloudBackend() : createLocalBackend();
  }
  return backend;
}

/**
 * Decide which backend to use. NEXT_PUBLIC_STORAGE forces a mode when set;
 * otherwise probe the server. Falls back to local if the probe fails (offline).
 */
export async function detectBackend(): Promise<StorageBackend> {
  const forced = process.env.NEXT_PUBLIC_STORAGE;
  if (forced === "cloud") return configureBackend(true);
  if (forced === "local") return configureBackend(false);
  try {
    const res = await fetch("/api/config", { credentials: "same-origin" });
    if (res.ok) {
      const { cloud } = (await res.json()) as { cloud?: boolean };
      return configureBackend(!!cloud);
    }
  } catch {
    /* offline — fall through to local */
  }
  return configureBackend(false);
}

export function currentMode(): "local" | "cloud" | null {
  return mode;
}

export * from "./types";
export { thumbCache } from "./thumb-cache";
