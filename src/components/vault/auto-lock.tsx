"use client";
/** Locks the vault after a period of inactivity (defense against a left-open tab). */
import { useEffect } from "react";
import { AUTO_LOCK_MS } from "@/lib/auth/policy";
import { useVault } from "@/store/vault-store";

export function AutoLock() {
  const lock = useVault((s) => s.lock);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => lock(), AUTO_LOCK_MS);
    };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [lock]);

  return null;
}
