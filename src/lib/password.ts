// password.ts — PBKDF2-HMAC-SHA256 password verification.
//
// WHAT THIS IS FOR. It stops a password being *readable* in the shipped bundle
// and in browser storage. The seed used to carry a `"password"` field in clear
// against a real mailbox, so anyone who opened devtools — or grepped the built
// index.js — had a credential that very likely unlocked something other than
// this demo. A verifier hash removes that.
//
// WHAT THIS IS NOT. It is not an authentication boundary. Every check here runs
// on hardware the attacker controls, so anyone determined to be an
// administrator in their own browser can simply edit the stored session. A real
// boundary lives on a server that the browser cannot rewrite; see the
// "Server-side requirements" section of src/database/README.md. Treat this
// module as credential hygiene and provisioning UX, nothing more.
//
// crypto.subtle is used when it exists and a pure-JS implementation otherwise:
// the deployed app is served over plain http, where the browser withholds
// SubtleCrypto entirely. Both paths compute the same PBKDF2, so a hash written
// by one verifies under the other.

/** Iterations. High enough to cost real time, low enough not to stall sign-in. */
export const PBKDF2_ITERATIONS = 120_000
const DERIVED_KEY_BYTES = 32
const SALT_BYTES = 16

// ── SHA-256 ────────────────────────────────────────────────────────────────

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const INITIAL_HASH = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
])

function rotr(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits))
}

function sha256(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8
  // Message + 0x80 + zero padding to 56 mod 64 + 8-byte big-endian length.
  const paddedLength = (((message.length + 8) >> 6) + 1) << 6
  const block = new Uint8Array(paddedLength)
  block.set(message)
  block[message.length] = 0x80
  const view = new DataView(block.buffer)
  // Lengths above 2^32 bits cannot occur here (passwords and 32-byte blocks),
  // so the high word is always zero.
  view.setUint32(paddedLength - 4, bitLength >>> 0, false)
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false)

  const hash = INITIAL_HASH.slice()
  const w = new Uint32Array(64)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, h] = hash
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    hash[0] = (hash[0] + a) >>> 0
    hash[1] = (hash[1] + b) >>> 0
    hash[2] = (hash[2] + c) >>> 0
    hash[3] = (hash[3] + d) >>> 0
    hash[4] = (hash[4] + e) >>> 0
    hash[5] = (hash[5] + f) >>> 0
    hash[6] = (hash[6] + g) >>> 0
    hash[7] = (hash[7] + h) >>> 0
  }

  const digest = new Uint8Array(32)
  const digestView = new DataView(digest.buffer)
  for (let i = 0; i < 8; i++) digestView.setUint32(i * 4, hash[i], false)
  return digest
}

// ── HMAC / PBKDF2 ──────────────────────────────────────────────────────────

const BLOCK_BYTES = 64

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const normalizedKey = new Uint8Array(BLOCK_BYTES)
  normalizedKey.set(key.length > BLOCK_BYTES ? sha256(key) : key)

  const inner = new Uint8Array(BLOCK_BYTES + message.length)
  const outer = new Uint8Array(BLOCK_BYTES + 32)
  for (let i = 0; i < BLOCK_BYTES; i++) {
    inner[i] = normalizedKey[i] ^ 0x36
    outer[i] = normalizedKey[i] ^ 0x5c
  }
  inner.set(message, BLOCK_BYTES)
  outer.set(sha256(inner), BLOCK_BYTES)
  return sha256(outer)
}

/** PBKDF2-HMAC-SHA256 with dkLen == 32, so exactly one block is produced. */
function pbkdf2Fallback(password: Uint8Array, salt: Uint8Array, iterations: number): Uint8Array {
  const seed = new Uint8Array(salt.length + 4)
  seed.set(salt)
  // Block index 1, big-endian.
  seed[salt.length + 3] = 1

  let u = hmacSha256(password, seed)
  const result = u.slice()
  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(password, u)
    for (let j = 0; j < DERIVED_KEY_BYTES; j++) result[j] ^= u[j]
  }
  return result
}

async function pbkdf2Subtle(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  try {
    const key = await crypto.subtle.importKey('raw', password as BufferSource, 'PBKDF2', false, [
      'deriveBits',
    ])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
      key,
      DERIVED_KEY_BYTES * 8,
    )
    return new Uint8Array(bits)
  } catch {
    return null
  }
}

// ── Encoding ───────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length >> 1)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** A stored verifier. Never contains the password. */
export interface PasswordHash {
  algorithm: 'pbkdf2-sha256'
  iterations: number
  /** Hex. */
  salt: string
  /** Hex, 32 bytes. */
  hash: string
}

function randomSalt(): Uint8Array {
  const bytes = new Uint8Array(SALT_BYTES)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    // getRandomValues is NOT secure-context-gated, unlike randomUUID and
    // subtle — it is a real CSPRNG on the plain-http deployment too.
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < SALT_BYTES; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** Derive a verifier for a new or changed password. */
export async function hashPassword(
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<PasswordHash> {
  const salt = randomSalt()
  const passwordBytes = utf8(password)
  const derived =
    (await pbkdf2Subtle(passwordBytes, salt, iterations)) ??
    pbkdf2Fallback(passwordBytes, salt, iterations)
  return {
    algorithm: 'pbkdf2-sha256',
    iterations,
    salt: toHex(salt),
    hash: toHex(derived),
  }
}

/**
 * Constant-time-ish comparison.
 *
 * Timing side channels are not the threat model for a check that runs entirely
 * on the attacker's own machine, but early-return equality is the kind of thing
 * that gets copied into a context where it does matter.
 */
function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Check a candidate password against a stored verifier. */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  if (stored.algorithm !== 'pbkdf2-sha256') return false
  const salt = fromHex(stored.salt)
  const passwordBytes = utf8(password)
  const derived =
    (await pbkdf2Subtle(passwordBytes, salt, stored.iterations)) ??
    pbkdf2Fallback(passwordBytes, salt, stored.iterations)
  return equalHex(toHex(derived), stored.hash)
}

/**
 * Minimum strength for a password set inside the app. Deliberately about
 * length rather than character classes: length is what actually resists the
 * offline attack a client-side verifier is exposed to.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters.'
  if (/^\d+$/.test(password)) return 'Digits alone are guessed almost instantly. Add words.'
  if (/^(.)\1+$/.test(password)) return 'A single repeated character is not a password.'
  return null
}

/** Exposed for the seed-hash generator in scripts/. */
export const __internals = { sha256, hmacSha256, pbkdf2Fallback, toHex, fromHex }
