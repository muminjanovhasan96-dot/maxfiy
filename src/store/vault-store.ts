"use client";
/**
 * Global vault session state. Holds the live VaultRepository (which in turn holds
 * the in-memory master key) only while unlocked. Locking disposes the repository,
 * zeroes the key, and clears decrypted caches.
 */
import { create } from "zustand";
import { createVault, deriveAuthKeyB64, type VaultHeader } from "@/lib/crypto";
import { getBackend } from "@/lib/storage";
import {
  markRegistered,
  requestPersistence,
  wasEverRegistered,
} from "@/lib/storage/indexeddb";
import { establishCloudSession } from "@/lib/storage/remote";
import { VaultRepository } from "@/lib/repo/vault-repo";

/** In cloud mode, open an API session proving password knowledge. No-op locally. */
async function maybeCloudSession(masterKey: Uint8Array): Promise<void> {
  if (getBackend().kind !== "cloud") return;
  const authKey = await deriveAuthKeyB64(masterKey);
  await establishCloudSession(authKey);
}

export type VaultStatus =
  | "loading"
  | "needs-setup"
  | "locked"
  | "unlocked";

interface VaultState {
  status: VaultStatus;
  header: VaultHeader | null;
  repo: VaultRepository | null;
  /** bumps whenever the item set changes, so lists can re-query. */
  revision: number;
  /** true when a vault was created before but its local data is now gone. */
  dataLost: boolean;

  init: () => Promise<void>;
  setup: (input: {
    passwordA: string;
    passwordB: string;
    word1: string;
    word2: string;
  }) => Promise<void>;
  /** Complete an unlock once the master key has been recovered client-side. */
  openWithMasterKey: (masterKey: Uint8Array, header: VaultHeader) => Promise<void>;
  lock: () => void;
  bump: () => void;
}

export const useVault = create<VaultState>((set, get) => ({
  status: "loading",
  header: null,
  repo: null,
  revision: 0,
  dataLost: false,

  async init() {
    // Ask the browser not to evict our vault, then look for an existing header.
    void requestPersistence();
    const header = await getBackend().metadata.getHeader();
    if (header) {
      set({ header, status: "locked", dataLost: false });
    } else {
      set({ header: null, status: "needs-setup", dataLost: wasEverRegistered() });
    }
  },

  async setup(input) {
    const { header, masterKey } = await createVault({ ...input, now: Date.now() });
    // First-run header write (allowed without a session when the vault is empty),
    // then open a session so subsequent item/blob writes are authorized.
    await getBackend().metadata.putHeader(header);
    await maybeCloudSession(masterKey);
    void requestPersistence();
    markRegistered();
    const repo = new VaultRepository(masterKey);
    set({ header, repo, status: "unlocked", dataLost: false });
  },

  async openWithMasterKey(masterKey, header) {
    await maybeCloudSession(masterKey);
    markRegistered();
    const repo = new VaultRepository(masterKey);
    set({ repo, header, status: "unlocked", dataLost: false });
  },

  lock() {
    get().repo?.dispose();
    set({ repo: null, status: "locked" });
  },

  bump() {
    set((s) => ({ revision: s.revision + 1 }));
  },
}));
