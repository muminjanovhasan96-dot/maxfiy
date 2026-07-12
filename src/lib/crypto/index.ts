/**
 * Public surface of the zero-knowledge crypto layer.
 *
 *   kdf.ts        Argon2id key derivation (passwords/words -> 256-bit keys)
 *   envelope.ts   AES-256-GCM seal/open, DEK wrapping, double-envelope master key
 *   stream.ts     chunked cipher for large media (videos never fully in memory)
 *   thumbnails.ts client-side thumbnail + blur-up placeholder generation
 *   vault.ts      create / staged-unlock / recovery flows over a VaultHeader
 *
 * Nothing here ever transmits a password, word, master key, or DEK to a server.
 */
export * from "./bytes";
export * from "./kdf";
export * from "./envelope";
export * from "./stream";
export * from "./thumbnails";
export * from "./vault";
