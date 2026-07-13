"use client";
/**
 * Initializes the vault session on first load of ANY route. Without this, a hard
 * reload of /vault (where nothing else calls init) would hang on "Redirecting…".
 * init() guards against clobbering an already-unlocked session.
 */
import { useEffect } from "react";
import { useVault } from "@/store/vault-store";

export function VaultBoot() {
  const init = useVault((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  return null;
}
