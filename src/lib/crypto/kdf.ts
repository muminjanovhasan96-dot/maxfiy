/**
 * Key derivation — Argon2id via hash-wasm (runs fully in the browser).
 *
 * The master password, the second password, and the recovery words are turned
 * into 256-bit keys here and NEVER leave the device. Only the KDF *parameters*
 * and the random *salts* are stored server-side; those are not secret.
 */
import { argon2id } from "hash-wasm";
import { utf8 } from "./bytes";

export interface KdfParams {
  /** Memory cost in KiB. 65536 KiB = 64 MiB. Higher is more resistant to GPU/ASIC cracking. */
  memoryKiB: number;
  /** Time cost (number of passes). */
  iterations: number;
  /** Degree of parallelism (lanes). */
  parallelism: number;
  /** Output key length in bytes (32 = 256-bit). */
  hashLength: number;
}

/**
 * Sensible defaults for an interactive browser login. ~64 MiB / 3 passes is a
 * good balance: strong against offline cracking while staying usable on a phone.
 * Bump memoryKiB to 131072 (128 MiB) on capable devices for extra margin.
 */
export const DEFAULT_KDF: KdfParams = {
  memoryKiB: 65536,
  iterations: 3,
  parallelism: 1,
  hashLength: 32,
};

/**
 * Derive raw key bytes from a secret + salt. `argon2id` from hash-wasm returns
 * the raw hash bytes (outputType: "binary").
 */
export async function deriveKeyBytes(
  secret: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF,
): Promise<Uint8Array> {
  const hash = await argon2id({
    password: utf8(secret),
    salt,
    memorySize: params.memoryKiB,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return new Uint8Array(hash);
}

/**
 * Concatenate two secrets into one KDF input. Not used by the double-envelope
 * login/recovery flows (which keep the two secrets independent); provided for
 * callers that want a single combined key.
 */
export function combineSecrets(a: string, b: string): string {
  return `${a}${b}`;
}
