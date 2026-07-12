# Maxfiy — a private, zero-knowledge vault

A polished, single-owner encrypted vault for your most personal data — contacts,
photos, videos, notes, passwords and documents. **All encryption and decryption
happen in your browser. The server only ever sees ciphertext.**

Built with Next.js (App Router) + TypeScript, Tailwind + Radix, Framer Motion,
and the Web Crypto API. Deploys to Vercel; runs locally with zero setup.

---

## Highlights

- **Zero-knowledge (E2EE).** Master password → key via **Argon2id** (in-browser).
  **Envelope encryption**: every item gets a random **DEK**, content is sealed
  with **AES-256-GCM**, and the DEK is wrapped by your master key. Only wrapped
  DEKs + IVs are ever stored.
- **Two-stage login.** Two independent passwords (A then B). The master key is
  wrapped in a **double envelope** — Password A peels the outer layer, Password B
  the inner. Both are required; each is verified by its own GCM auth tag. Neither
  password is ever sent to the server.
- **Two-word recovery.** A separate double-envelope wrapping of the *same* master
  key by two secret words, for the "Forgot password?" path.
- **Brute-force lockout.** 2 wrong attempts → 15-minute lock, enforced
  **server-side** (keyed by IP + device cookie) so a refresh can't bypass it,
  with a live countdown. Covers the recovery flow too.
- **Apple-Photos-grade gallery.** Uniform, virtualized, date-grouped grid that
  stays smooth at **100k+** items. Lazy per-cell thumbnail decryption, two-tier
  thumbnail cache (memory + IndexedDB with LRU eviction), fullscreen viewer with
  swipe / arrow / zoom.
- **Chunked media crypto.** Videos are encrypted/decrypted in 4 MiB chunks (each
  with its own IV, chunk order bound via GCM AAD) so they never load fully into
  memory.
- **Premium, minimalist UI.** Dark by default, light mode, calm blurred lock
  screen, soft shadows, subtle motion. Responsive down to phones.
- **Auto-lock**, encrypted **export/backup**, **trash** with permanent delete,
  favorites, and client-side **encrypted search**.

## Quick start (local, on-device — the default)

```bash
npm install
npm run dev
# open http://localhost:3000
```

On first run you'll create your vault: two passwords + two recovery words. Data
is stored **encrypted in IndexedDB on this device** — nothing leaves it. Use
**Export backup** (top-right menu) to save an encrypted backup file.

> A hard reload re-locks the vault (the master key lives only in memory) — this
> is intentional for a vault.

## Architecture

```
src/
  lib/crypto/        Zero-knowledge crypto (no network)
    kdf.ts           Argon2id (hash-wasm)
    envelope.ts      AES-256-GCM seal/open, DEK wrap, double-envelope master key
    stream.ts        chunked cipher for large media
    thumbnails.ts    client-side thumbnail + blur-up color
    vault.ts         createVault / staged login / staged recovery / key rotation
  lib/auth/          policy (2 attempts / 15 min / auto-lock), lockout client, strength
  lib/storage/       StorageBackend contracts + backends
    indexeddb.ts     local backend (default)
    remote.ts        cloud backend (calls this app's API routes)
    thumb-cache.ts   decrypted-thumbnail LRU cache
  lib/repo/          VaultRepository (encrypt-on-write / decrypt-on-read) + backup
  lib/server/        cloud-only: Postgres (Neon) store, Vercel Blob refs, session
  app/               UI (lock/setup, vault shell, sections) + API routes
  components/         auth screens, gallery, section editors, UI primitives
  middleware.ts      per-request nonce-based Content-Security-Policy
```

The UI only ever talks to `VaultRepository`, which holds the in-memory master key
and moves **only ciphertext** across the storage boundary.

## Deploy to Vercel (cloud, multi-device)

The default is on-device. To sync across devices and survive device loss, use the
cloud backend — the server still only stores ciphertext.

1. Create a **Neon** (Postgres) database and a **Vercel Blob** store; optionally an
   **Upstash Redis** for durable lockout.
2. Set environment variables (see `.env.example`):
   - `NEXT_PUBLIC_STORAGE=cloud`
   - `DATABASE_URL` (Neon)
   - `BLOB_READ_WRITE_TOKEN` (auto on Vercel when a Blob store is attached)
   - `OWNER_ACCESS_CODE` + `SESSION_SECRET` (API access gate — see below)
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (recommended)
3. `git push` → import into Vercel → deploy. Tables are created automatically.

**Cloud API gate.** Because your two vault passwords never reach the server, cloud
mode protects the ciphertext store with a separate short `OWNER_ACCESS_CODE`
(POST to `/api/session` mints a signed httpOnly cookie). This is *access control*,
not secrecy — the encryption is what keeps data unreadable. Wiring the access-code
prompt into the setup/unlock UI is the one remaining step for a turnkey cloud
deploy; the enforced API routes are already in place.

## Security model & honest trade-offs

- **What the server can never see:** passwords, recovery words, master key, DEKs,
  and all content/metadata inside `sealedMeta` (names, note bodies, contact fields,
  dimensions, EXIF, …). All of it is AES-256-GCM ciphertext.
- **What cloud mode stores in plaintext (metadata only):** item `type`, a `sortKey`
  (capture/creation time) and the `favorite`/`deletedAt` flags — needed for
  efficient server-side pagination and date grouping. This leaks *when* items were
  added, never *what* they are. **Local mode leaks nothing** (all on-device).
- **Local caches:** decrypted thumbnails are cached in IndexedDB for gallery speed
  and cleared from memory on lock. The decrypted local index trades some at-rest
  exposure on your *trusted device* for performance — protect the device with disk
  encryption + auto-lock. Use **Erase this device** to wipe it.
- **KDF cost:** Argon2id defaults to 64 MiB / 3 passes (see `lib/crypto/kdf.ts`);
  raise `memoryKiB` on capable devices. As with any password-based E2EE, the
  server holds the wrapped key and could attempt offline cracking — strong
  passwords + a strong KDF are your protection, and the two-stage login doubles
  the required entropy.
- **Headers:** strict per-request CSP with nonce (`middleware.ts`), HSTS, no
  third-party scripts/trackers, `frame-ancestors 'none'`.

## Non-negotiables — where each lives

| Requirement | Implementation |
| --- | --- |
| Zero-knowledge (server never sees plaintext) | `lib/crypto/*`, ciphertext-only storage |
| Two-stage login (2 passwords) | `envelope.ts` double envelope + `vault.ts` staged unlock |
| Two-word recovery | `vault.ts` `recoveryStage1/2` |
| 2 attempts → 15-min lockout | `app/api/lockout` + `lib/auth/use-lockout` |
| Apple-Photos gallery @ 100k+ | `components/gallery/*` (windowed virtualization) |
| Chunked media | `lib/crypto/stream.ts` |
| Minimalist premium design | Tailwind theme, `components/auth`, `globals.css` |

## Scripts

```bash
npm run dev        # develop
npm run build      # production build (type-checked)
npm run start      # run the production build
npm run typecheck  # tsc --noEmit
```

## Roadmap / nice-to-haves noted in the spec

WebAuthn/passkey + TOTP as an extra layer; true MSE-streamed video playback
(chunks are already streamed on decrypt); resumable multi-part cloud uploads;
per-album organization; wiring the cloud access-code prompt into the UI.

---

Not affiliated with Apple. "Apple Photos" is referenced only to describe the
gallery experience.
