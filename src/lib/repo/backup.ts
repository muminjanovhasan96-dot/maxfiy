/**
 * Encrypted export / import. Because every blob and every metadata field is
 * already ciphertext, the exported file is itself zero-knowledge: it is safe to
 * store on any cloud drive or USB stick. Only your passwords/words can open it.
 *
 * Format (JSON):
 *   { app, version, exportedAt, header, items:[StoredItem], blobs:{ key: base64 } }
 */
import { fromBase64, toBase64, type VaultHeader } from "@/lib/crypto";
import { getBackend } from "@/lib/storage";
import type { StoredItem } from "@/lib/storage/types";

const MAGIC = "maxfiy-vault-backup";
const FORMAT_VERSION = 1;

interface BackupFile {
  app: string;
  version: number;
  exportedAt: number;
  header: VaultHeader | null;
  items: StoredItem[];
  blobs: Record<string, string>; // key -> base64 ciphertext
}

export async function exportBackup(): Promise<Blob> {
  const backend = getBackend();
  const header = await backend.metadata.getHeader();
  const items = await backend.metadata.listItems();

  const blobs: Record<string, string> = {};
  for (const item of items) {
    for (const key of [item.blobKey, item.thumbKey]) {
      if (!key || blobs[key]) continue;
      const blob = await backend.blobs.get(key);
      if (blob) blobs[key] = toBase64(new Uint8Array(await blob.arrayBuffer()));
    }
  }

  const file: BackupFile = {
    app: MAGIC,
    version: FORMAT_VERSION,
    exportedAt: Date.now(),
    header,
    items,
    blobs,
  };
  return new Blob([JSON.stringify(file)], { type: "application/json" });
}

export async function importBackup(file: File): Promise<{ items: number }> {
  const parsed = JSON.parse(await file.text()) as BackupFile;
  if (parsed.app !== MAGIC) throw new Error("Not a Maxfiy backup file");
  const backend = getBackend();

  if (parsed.header) await backend.metadata.putHeader(parsed.header);
  for (const [key, b64] of Object.entries(parsed.blobs)) {
    await backend.blobs.put(key, new Blob([fromBase64(b64)]));
  }
  for (const item of parsed.items) await backend.metadata.putItem(item);

  return { items: parsed.items.length };
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
