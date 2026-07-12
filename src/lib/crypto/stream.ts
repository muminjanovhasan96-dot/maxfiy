/**
 * Chunked / streamed AES-256-GCM for large media (videos, big documents).
 *
 * The plaintext is split into fixed-size chunks; each chunk is encrypted with its
 * own random IV under the item's DEK. The chunk index and total chunk count are
 * bound in as GCM additional-authenticated-data (AAD), so reordering, dropping,
 * or truncating chunks is detected on decrypt.
 *
 * On-disk chunk layout (concatenated in the stored blob):
 *   [ iv: 12 bytes ][ ciphertext + 16-byte tag ]
 * The plaintext length of every chunk is `chunkSize`, except the final chunk.
 * `StreamMeta` carries just enough to walk the boundaries on decrypt.
 */
import { concatBytes, randomBytes, u32be } from "./bytes";

export const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface StreamMeta {
  chunkSize: number;
  totalSize: number; // plaintext byte length
  chunks: number;
}

async function importDek(dekRaw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", dekRaw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function aad(index: number, total: number): Uint8Array {
  return concatBytes(u32be(index), u32be(total));
}

/**
 * Encrypt a Blob/File into an encrypted Blob, reading one chunk of PLAINTEXT at a
 * time. The ciphertext is streamed into the resulting Blob via a ReadableStream so
 * the browser can spill it to disk rather than holding it all in memory.
 */
export async function encryptFileToBlob(
  dekRaw: Uint8Array,
  file: Blob,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): Promise<{ blob: Blob; meta: StreamMeta }> {
  const key = await importDek(dekRaw);
  const totalSize = file.size;
  const chunks = Math.max(1, Math.ceil(totalSize / chunkSize));

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      // We encrypt sequentially; enqueue all chunks then close.
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const pt = new Uint8Array(await file.slice(start, end).arrayBuffer());
        const iv = randomBytes(IV_LENGTH);
        const ct = new Uint8Array(
          await crypto.subtle.encrypt(
            { name: "AES-GCM", iv, additionalData: aad(i, chunks) },
            key,
            pt,
          ),
        );
        controller.enqueue(concatBytes(iv, ct));
      }
      controller.close();
    },
  });

  const blob = await new Response(stream).blob();
  return { blob, meta: { chunkSize, totalSize, chunks } };
}

/** Byte length of an encrypted chunk given its plaintext length. */
function encChunkLength(plainLen: number): number {
  return IV_LENGTH + plainLen + TAG_LENGTH;
}

/**
 * Decrypt an encrypted Blob into a ReadableStream of plaintext bytes. Suitable
 * for `new Response(stream).blob()` (download) or progressive consumption.
 */
export function decryptToStream(
  dekRaw: Uint8Array,
  encrypted: Blob,
  meta: StreamMeta,
): ReadableStream<Uint8Array> {
  const { chunkSize, totalSize, chunks } = meta;
  const fullEncChunk = encChunkLength(chunkSize);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const key = await importDek(dekRaw);
      let offset = 0;
      for (let i = 0; i < chunks; i++) {
        const plainLen =
          i === chunks - 1 ? totalSize - i * chunkSize : chunkSize;
        const encLen = i === chunks - 1 ? encChunkLength(plainLen) : fullEncChunk;
        const encSlice = new Uint8Array(
          await encrypted.slice(offset, offset + encLen).arrayBuffer(),
        );
        offset += encLen;
        const iv = encSlice.subarray(0, IV_LENGTH);
        const ct = encSlice.subarray(IV_LENGTH);
        try {
          const pt = new Uint8Array(
            await crypto.subtle.decrypt(
              { name: "AES-GCM", iv, additionalData: aad(i, chunks) },
              key,
              ct,
            ),
          );
          controller.enqueue(pt);
        } catch (err) {
          controller.error(
            new Error(`Chunk ${i} failed authentication (tampered or wrong key).`),
          );
          return;
        }
      }
      controller.close();
    },
  });
}

/** Convenience: fully decrypt to a typed Blob (e.g. for a <video src> object URL). */
export async function decryptToBlob(
  dekRaw: Uint8Array,
  encrypted: Blob,
  meta: StreamMeta,
  mimeType: string,
): Promise<Blob> {
  const stream = decryptToStream(dekRaw, encrypted, meta);
  const buf = await new Response(stream).arrayBuffer();
  return new Blob([buf], { type: mimeType });
}
