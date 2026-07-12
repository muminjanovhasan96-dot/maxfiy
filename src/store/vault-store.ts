"use client";
/**
 * Global vault session state. Holds the live VaultRepository (which in turn holds
 * the in-memory master key) only while unlocked. Locking disposes the repository,
 * zeroes the key, and clears decrypted caches.
 */
import { create } from "zustand";
import { createVault, type VaultHeader } from "@/lib/crypto";
import { getBackend } from "@/lib/storage";
import { VaultRepository } from "@/lib/repo/vault-repo";

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

  init: () => Promise<void>;
  setup: (input: {
    passwordA: string;
    passwordB: string;
    word1: string;
    word2: string;
  }) => Promise<void>;
  /** Complete an unlock once the master key has been recovered client-side. */
  openWithMasterKey: (masterKey: Uint8Array, header: VaultHeader) => void;
  lock: () => void;
  bump: () => void;
}

export const useVault = create<VaultState>((set, get) => ({
  status: "loading",
  header: null,
  repo: null,
  revision: 0,

  async init() {
    const header = await getBackend().metadata.getHeader();
    set({ header, status: header ? "locked" : "needs-setup" });
  },

  async setup(input) {
    const { header, masterKey } = await createVault({ ...input, now: Date.now() });
    await getBackend().metadata.putHeader(header);
    const repo = new VaultRepository(masterKey);
    set({ header, repo, status: "unlocked" });
  },

  openWithMasterKey(masterKey, header) {
    const repo = new VaultRepository(masterKey);
    set({ repo, header, status: "unlocked" });
  },

  lock() {
    get().repo?.dispose();
    set({ repo: null, status: "locked" });
  },

  bump() {
    set((s) => ({ revision: s.revision + 1 }));
  },
}));
