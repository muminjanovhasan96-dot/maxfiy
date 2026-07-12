/** Shared auth policy constants (used by both the client and the lockout API). */

/** Wrong attempts allowed before a lockout kicks in. Spec: 2 wrong => lock. */
export const MAX_ATTEMPTS = 2;

/** Lockout duration once the attempt budget is exhausted. Spec: 15 minutes. */
export const LOCKOUT_MS = 15 * 60 * 1000;

/** Auto-lock the vault after this much inactivity (no pointer/key events). */
export const AUTO_LOCK_MS = 5 * 60 * 1000;

/** Clipboard auto-clear delay after copying a password. */
export const CLIPBOARD_CLEAR_MS = 20 * 1000;

export interface LockoutStatus {
  locked: boolean;
  remainingMs: number;
  attemptsLeft: number;
}
