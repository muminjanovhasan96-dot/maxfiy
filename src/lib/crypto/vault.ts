/**
 * High-level vault crypto: create the vault, and the staged unlock / recovery
 * flows. This ties together the KDF and the double-envelope from envelope.ts.
 *
 * The "VaultHeader" is the only crypto material stored server-side. It contains
 * NO secrets — only KDF parameters, random salts, and the wrapped (encrypted)
 * master key. It cannot be used to read any vault content without the passwords.
 */
import { fromBase64, toBase64 } from "./bytes";
import {
  deriveAuthHash,
  doubleWrapMasterKey,
  ensureWebCrypto,
  generateMasterKey,
  openInnerLayer,
  openOuterLayer,
  type OuterOpened,
  type SealedBytes,
} from "./envelope";
import { DEFAULT_KDF, deriveKeyBytes, type KdfParams } from "./kdf";

export const VAULT_VERSION = 1;

export interface VaultHeader {
  version: number;
  kdf: KdfParams;
  saltA: string; // base64
  saltB: string;
  saltR1: string;
  saltR2: string;
  /** master key wrapped so both login passwords (A outer, B inner) are required. */
  wrappedMaster: SealedBytes;
  /** the SAME master key, wrapped so both recovery words (1 outer, 2 inner) are required. */
  wrappedMasterRecovery: SealedBytes;
  /** SHA-256(SHA-256(masterKey‖ctx)) — public verifier used to gate the cloud API. */
  authHash?: string;
  createdAt: number;
}

export interface CreateVaultInput {
  passwordA: string;
  passwordB: string;
  word1: string;
  word2: string;
  kdf?: KdfParams;
  now: number;
}

function newSaltB64(len = 16): string {
  const s = new Uint8Array(len);
  crypto.getRandomValues(s);
  return toBase64(s);
}

/**
 * First-run setup. Generates a random master key, wraps it two ways (login +
 * recovery), and returns the header to persist plus the live master key so the
 * caller can immediately start using the vault.
 */
export async function createVault(
  input: CreateVaultInput,
): Promise<{ header: VaultHeader; masterKey: Uint8Array }> {
  ensureWebCrypto();
  const kdf = input.kdf ?? DEFAULT_KDF;
  const saltA = newSaltB64();
  const saltB = newSaltB64();
  const saltR1 = newSaltB64();
  const saltR2 = newSaltB64();

  const [keyA, keyB, keyR1, keyR2] = await Promise.all([
    deriveKeyBytes(input.passwordA, fromBase64(saltA), kdf),
    deriveKeyBytes(input.passwordB, fromBase64(saltB), kdf),
    deriveKeyBytes(input.word1, fromBase64(saltR1), kdf),
    deriveKeyBytes(input.word2, fromBase64(saltR2), kdf),
  ]);

  const masterKey = generateMasterKey();
  const wrappedMaster = await doubleWrapMasterKey(keyA, keyB, masterKey);
  const wrappedMasterRecovery = await doubleWrapMasterKey(keyR1, keyR2, masterKey);
  const authHash = await deriveAuthHash(masterKey);

  const header: VaultHeader = {
    version: VAULT_VERSION,
    kdf,
    saltA,
    saltB,
    saltR1,
    saltR2,
    wrappedMaster,
    wrappedMasterRecovery,
    authHash,
    createdAt: input.now,
  };
  return { header, masterKey };
}

// ---------------------------------------------------------------------------
// Staged login: Password A, then Password B
// ---------------------------------------------------------------------------

export interface StageAResult {
  /** Opaque handle to pass into stage B. Contains the inner (Password-B) layer. */
  outer: OuterOpened;
}

/** Verify Password A. Throws if wrong (the GCM tag on the outer layer won't match). */
export async function loginStageA(
  header: VaultHeader,
  passwordA: string,
): Promise<StageAResult> {
  ensureWebCrypto();
  const keyA = await deriveKeyBytes(passwordA, fromBase64(header.saltA), header.kdf);
  const outer = await openOuterLayer(keyA, header.wrappedMaster);
  return { outer };
}

/** Verify Password B and recover the master key. Throws if wrong. */
export async function loginStageB(
  header: VaultHeader,
  stageA: StageAResult,
  passwordB: string,
): Promise<Uint8Array> {
  const keyB = await deriveKeyBytes(passwordB, fromBase64(header.saltB), header.kdf);
  return openInnerLayer(keyB, stageA.outer.inner);
}

// ---------------------------------------------------------------------------
// Staged recovery: Word 1, then Word 2
// ---------------------------------------------------------------------------

export interface RecoveryStage1Result {
  outer: OuterOpened;
}

export async function recoveryStage1(
  header: VaultHeader,
  word1: string,
): Promise<RecoveryStage1Result> {
  ensureWebCrypto();
  const keyR1 = await deriveKeyBytes(word1, fromBase64(header.saltR1), header.kdf);
  const outer = await openOuterLayer(keyR1, header.wrappedMasterRecovery);
  return { outer };
}

export async function recoveryStage2(
  header: VaultHeader,
  stage1: RecoveryStage1Result,
  word2: string,
): Promise<Uint8Array> {
  const keyR2 = await deriveKeyBytes(word2, fromBase64(header.saltR2), header.kdf);
  return openInnerLayer(keyR2, stage1.outer.inner);
}

// ---------------------------------------------------------------------------
// Rotation helpers (used by "change password" / "reset recovery words")
// ---------------------------------------------------------------------------

export async function rewrapForLogin(
  header: VaultHeader,
  masterKey: Uint8Array,
  passwordA: string,
  passwordB: string,
): Promise<VaultHeader> {
  const saltA = newSaltB64();
  const saltB = newSaltB64();
  const [keyA, keyB] = await Promise.all([
    deriveKeyBytes(passwordA, fromBase64(saltA), header.kdf),
    deriveKeyBytes(passwordB, fromBase64(saltB), header.kdf),
  ]);
  const wrappedMaster = await doubleWrapMasterKey(keyA, keyB, masterKey);
  return { ...header, saltA, saltB, wrappedMaster };
}

export async function rewrapForRecovery(
  header: VaultHeader,
  masterKey: Uint8Array,
  word1: string,
  word2: string,
): Promise<VaultHeader> {
  const saltR1 = newSaltB64();
  const saltR2 = newSaltB64();
  const [keyR1, keyR2] = await Promise.all([
    deriveKeyBytes(word1, fromBase64(saltR1), header.kdf),
    deriveKeyBytes(word2, fromBase64(saltR2), header.kdf),
  ]);
  const wrappedMasterRecovery = await doubleWrapMasterKey(keyR1, keyR2, masterKey);
  return { ...header, saltR1, saltR2, wrappedMasterRecovery };
}
