"use client";
import { CLIPBOARD_CLEAR_MS } from "@/lib/auth/policy";
import { toast } from "@/components/ui/toaster";
import { useLangStore } from "@/lib/i18n";
import { translate } from "@/lib/i18n/translations";

function tr(key: string, vars?: Record<string, string | number>): string {
  return translate(useLangStore.getState().lang, key, vars);
}

/**
 * Copy a secret to the clipboard and auto-clear it after a delay, so a copied
 * password doesn't linger. Best-effort: if clipboard read is unavailable, we
 * still overwrite after the delay.
 */
export async function copySecret(text: string, label?: string) {
  const shown = label ?? tr("clip.copied");
  try {
    await navigator.clipboard.writeText(text);
    toast.success(tr("clip.clears", { label: shown, n: Math.round(CLIPBOARD_CLEAR_MS / 1000) }));
  } catch {
    toast.error(tr("clip.unavailable"));
    return;
  }
  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) await navigator.clipboard.writeText("");
    } catch {
      await navigator.clipboard.writeText("").catch(() => {});
    }
  }, CLIPBOARD_CLEAR_MS);
}

export async function copyPlain(text: string, label?: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label ?? tr("clip.copied"));
  } catch {
    toast.error(tr("clip.unavailable"));
  }
}
