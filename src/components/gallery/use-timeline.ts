"use client";
/** Loads lightweight item stubs for a media timeline and re-loads on data changes. */
import { useCallback, useEffect, useState } from "react";
import { useVault } from "@/store/vault-store";
import type { ItemStub, ItemType, ListOptions } from "@/lib/storage/types";

export function useTimeline(opts: ListOptions & { type: ItemType | ItemType[] }) {
  const repo = useVault((s) => s.repo);
  const revision = useVault((s) => s.revision);
  const [stubs, setStubs] = useState<ItemStub[]>([]);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(opts);

  const load = useCallback(async () => {
    if (!repo) return;
    setLoading(true);
    const result = await repo.listStubs({ order: "desc", ...opts });
    setStubs(result);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, key]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  return { stubs, loading, reload: load };
}
