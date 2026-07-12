/**
 * Envelope encryption — the heart of the zero-knowledge model.
 *
 * - A random 256-bit *master key* is the root of trust. It never leaves memory
 *   in plaintext and is wrapped for storage.
 * - Every file/record gets its own random *DEK* (data encryption key). Content is
 *   encrypted with the DEK using AES-256-GCM. The DEK is then wrapped (encrypted)
 *   with the master key. Only the wrapped DEK + IV are stored server-side.
 * - The master key itself is wrapped with a DOUBLE envelope: the two login
 *   passwords (A then B) each peel one layer. Both are required, and each layer
 *   verifies independently via its GCM auth tag — that's the "Password A accepted,
 *   now enter Password B" behaviour, expressed cryptographically.
 */
import { concatBytes, fromBase64, randomBytes, toBase64 } from "./bytes";

const IV_LENGTH = 12; // 96-bit nonce, the recommended size for AES-GCM.
const KEY_LENGTH = 32; // AES-256.

/**
 * Web Crypto's `crypto.subtle` only exists in a *secure context*. That means an
 * https:// origin, or http://localhost opened directly — but NOT a page embedded
 * inside a non-secure ancestor (e.g. VS Code's built-in Simple Browser / a
 * webview), where `subtle` is undefined. Fail loudly with a fix instead of a
 * cryptic "reading 'importKey'".
 */
export function ensureWebCrypto(): void {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new Error(
      "Web Crypto is unavailable here (crypto.subtle is undefined). Open the app in a normal browser tab (Chrome/Safari/Edge) at http://localhost — not inside an embedded preview or webview.",
    );
  }
}

/** A wrapped key or ciphertext blob, portable as JSON. */
export interface SealedBytes {
  iv: string; // base64
  ct: string; // base64 (ciphertext + 16-byte GCM tag)
}

// ---------------------------------------------------------------------------
// Low-level AES-GCM primitives
// ---------------------------------------------------------------------------

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt bytes with a raw 256-bit key. Returns iv + ciphertext, base64-encoded. */
export async function seal(
  keyRaw: Uint8Array,
  plaintext: Uint8Array,
  additionalData?: Uint8Array,
): Promise<SealedBytes> {
  const key = await importAesKey(keyRaw);
  const iv = randomBytes(IV_LENGTH);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData },
      key,
      plaintext,
    ),
  );
  return { iv: toBase64(iv), ct: toBase64(ct) };
}

/** Decrypt a SealedBytes with a raw 256-bit key. Throws if the auth tag fails. */
export async function open(
  keyRaw: Uint8Array,
  sealed: SealedBytes,
  additionalData?: Uint8Array,
): Promise<Uint8Array> {
  const key = await importAesKey(keyRaw);
  const iv = fromBase64(sealed.iv);
  const ct = fromBase64(sealed.ct);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    ct,
  );
  return new Uint8Array(pt);
}

// ---------------------------------------------------------------------------
// Master key + double envelope
// ---------------------------------------------------------------------------

export function generateMasterKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

export function generateDek(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

/**
 * Wrap the master key so that BOTH keyA and keyB are needed to recover it.
 * inner = Enc(keyB, master); outer = Enc(keyA, serialize(inner)).
 * Returned value is a single SealedBytes (the outer layer).
 */
export async function doubleWrapMasterKey(
  keyA: Uint8Array,
  keyB: Uint8Array,
  master: Uint8Array,
): Promise<SealedBytes> {
  const inner = await seal(keyB, master);
  const innerBytes = concatBytes(fromBase64(inner.iv), fromBase64(inner.ct));
  return seal(keyA, innerBytes);
}

/** Result of peeling the outer layer: enough to attempt the inner (Password B) layer. */
export interface OuterOpened {
  inner: SealedBytes;
}

/**
 * Peel the OUTER layer with keyA. Throws if Password A is wrong (GCM tag fails).
 * This is the "Password A accepted" checkpoint.
 */
export async function openOuterLayer(
  keyA: Uint8Array,
  wrapped: SealedBytes,
): Promise<OuterOpened> {
  const innerBytes = await open(keyA, wrapped);
  const iv = innerBytes.subarray(0, IV_LENGTH);
  const ct = innerBytes.subarray(IV_LENGTH);
  return { inner: { iv: toBase64(iv), ct: toBase64(ct) } };
}

/** Peel the INNER layer with keyB. Throws if Password B is wrong. Returns the master key. */
export async function openInnerLayer(
  keyB: Uint8Array,
  inner: SealedBytes,
): Promise<Uint8Array> {
  return open(keyB, inner);
}

// ---------------------------------------------------------------------------
// DEK wrapping for individual items
// ---------------------------------------------------------------------------

export async function wrapDek(
  master: Uint8Array,
  dek: Uint8Array,
): Promise<SealedBytes> {
  return seal(master, dek);
}

export async function unwrapDek(
  master: Uint8Array,
  wrapped: SealedBytes,
): Promise<Uint8Array> {
  return open(master, wrapped);
}

// ---------------------------------------------------------------------------
// Raw binary blob helpers (encrypted thumbnails and other small single-shot blobs)
// Layout: [ iv: 12 bytes ][ ciphertext + 16-byte tag ]
// ---------------------------------------------------------------------------

export async function sealRawToBlob(
  keyRaw: Uint8Array,
  plaintext: Uint8Array,
): Promise<Blob> {
  const key = await importAesKey(keyRaw);
  const iv = randomBytes(IV_LENGTH);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  return new Blob([iv, ct]);
}

export async function openRawBlob(
  keyRaw: Uint8Array,
  blob: Blob,
): Promise<Uint8Array> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const iv = buf.subarray(0, IV_LENGTH);
  const ct = buf.subarray(IV_LENGTH);
  const key = await importAesKey(keyRaw);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct),
  );
}

// ---------------------------------------------------------------------------
// Small-payload helpers (metadata, notes, contacts, JSON records)
// ---------------------------------------------------------------------------

/** Encrypt a small item: generate a DEK, seal the content, wrap the DEK. */
export async function encryptItem(
  master: Uint8Array,
  plaintext: Uint8Array,
): Promise<{ content: SealedBytes; wrappedDek: SealedBytes }> {
  const dek = generateDek();
  const content = await seal(dek, plaintext);
  const wrappedDek = await wrapDek(master, dek);
  return { content, wrappedDek };
}

export async function decryptItem(
  master: Uint8Array,
  content: SealedBytes,
  wrappedDek: SealedBytes,
): Promise<Uint8Array> {
  const dek = await unwrapDek(master, wrappedDek);
  return open(dek, content);
}
