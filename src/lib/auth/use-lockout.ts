"use client";
import { useCallback, useEffect, useState } from "react";
import { getLockoutStatus, reportFailure, reportSuccess } from "./lockout-client";
import type { LockoutStatus } from "./policy";

export function useLockout() {
  const [status, setStatus] = useState<LockoutStatus | null>(null);
  const [remaining, setRemaining] = useState(0);

  const refresh = useCallback(async () => {
    const s = await getLockoutStatus();
    setStatus(s);
    setRemaining(s.remainingMs);
    return s;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tick down the visible countdown while locked.
  useEffect(() => {
    if (!status?.locked) return;
    const iv = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [status?.locked]);

  // When the countdown reaches zero, re-check with the server to clear the lock.
  useEffect(() => {
    if (status?.locked && remaining <= 0) void refresh();
  }, [remaining, status?.locked, refresh]);

  const fail = useCallback(async () => {
    const s = await reportFailure();
    setStatus(s);
    setRemaining(s.remainingMs);
    return s;
  }, []);

  const success = useCallback(async () => {
    const s = await reportSuccess();
    setStatus(s);
    return s;
  }, []);

  return {
    status,
    remaining,
    locked: !!status?.locked,
    attemptsLeft: status?.attemptsLeft ?? 2,
    refresh,
    fail,
    success,
  };
}
