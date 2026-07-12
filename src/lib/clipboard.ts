"use client";
import { CLIPBOARD_CLEAR_MS } from "@/lib/auth/policy";
import { toast } from "@/components/ui/toaster";

/**
 * Copy a secret to the clipboard and auto-clear it after a delay, so a copied
 * password doesn't linger. Best-effort: if clipboard read is unavailable, we
 * still overwrite after the delay.
 */
export async function copySecret(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} · clears in ${Math.round(CLIPBOARD_CLEAR_MS / 1000)}s`);
  } catch {
    toast.error("Clipboard unavailable");
    return;
  }
  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) await navigator.clipboard.writeText("");
    } catch {
      // Can't verify contents; overwrite anyway for safety.
      await navigator.clipboard.writeText("").catch(() => {});
    }
  }, CLIPBOARD_CLEAR_MS);
}

export async function copyPlain(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Clipboard unavailable");
  }
}
