/**
 * High-level vault crypto: create the vault, and the unlock / recovery flows.
 *
 * The "VaultHeader" is the only crypto material stored server-side. It contains
 * NO secrets — only KDF parameters, random salts, and the wrapped (encrypted)
 * master key. It cannot open any content without the password.
 *
 * Login uses ONE password (single envelope). Recovery uses TWO secret words
 * (double envelope) as an independent backup path to the same master key.
 */
import { fromBase64, toBase64 } from "./bytes";
import {
  deriveAuthHash,
  doubleWrapMasterKey,
  ensureWebCrypto,
  generateMasterKey,
  open,
  openInnerLayer,
  openOuterLayer,
  seal,
  type OuterOpened,
  type SealedBytes,
} from "./envelope";
import { DEFAULT_KDF, deriveKeyBytes, type KdfParams } from "./kdf";

export const VAULT_VERSION = 2;

export interface VaultHeader {
  version: number;
  kdf: KdfParams;
  saltA: string; // base64 — login password salt
  saltB?: string; // legacy (v1 two-password vaults); unused in v2
  saltR1: string; // recovery word 1 salt
  saltR2: string; // recovery word 2 salt
  /** master key wrapped by the login password (single AES-GCM envelope). */
  wrappedMaster: SealedBytes;
  /** the SAME master key, wrapped so both recovery words are required. */
  wrappedMasterRecovery: SealedBytes;
  /** public verifier used to gate the cloud API (never reveals the key). */
  authHash?: string;
  createdAt: number;
}

export interface CreateVaultInput {
  password: string;
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
 * First-run setup. Generates a random master key, wraps it for login (one
 * password) and for recovery (two words), and returns the header to persist plus
 * the live master key.
 */
export async function createVault(
  input: CreateVaultInput,
): Promise<{ header: VaultHeader; masterKey: Uint8Array }> {
  ensureWebCrypto();
  const kdf = input.kdf ?? DEFAULT_KDF;
  const saltA = newSaltB64();
  const saltR1 = newSaltB64();
  const saltR2 = newSaltB64();

  const [keyA, keyR1, keyR2] = await Promise.all([
    deriveKeyBytes(input.password, fromBase64(saltA), kdf),
    deriveKeyBytes(input.word1, fromBase64(saltR1), kdf),
    deriveKeyBytes(input.word2, fromBase64(saltR2), kdf),
  ]);

  const masterKey = generateMasterKey();
  const wrappedMaster = await seal(keyA, masterKey);
  const wrappedMasterRecovery = await doubleWrapMasterKey(keyR1, keyR2, masterKey);
  const authHash = await deriveAuthHash(masterKey);

  const header: VaultHeader = {
    version: VAULT_VERSION,
    kdf,
    saltA,
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
// Login: one password
// ---------------------------------------------------------------------------

/** Verify the password and recover the master key. Throws if wrong. */
export async function login(
  header: VaultHeader,
  password: string,
): Promise<Uint8Array> {
  ensureWebCrypto();
  const keyA = await deriveKeyBytes(password, fromBase64(header.saltA), header.kdf);
  return open(keyA, header.wrappedMaster);
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
  password: string,
): Promise<VaultHeader> {
  const saltA = newSaltB64();
  const keyA = await deriveKeyBytes(password, fromBase64(saltA), header.kdf);
  const wrappedMaster = await seal(keyA, masterKey);
  return { ...header, saltA, wrappedMaster };
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
