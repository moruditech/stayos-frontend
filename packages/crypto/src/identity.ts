import { idbGet, idbPut } from './idb';
import { bufToBase64, base64ToBuf, toArrayBuffer } from './base64';
import type { IdentityKeyPair, WrappedKeyDTO, KeyBackupDTO } from './types';

const CURVE = 'P-256';
// WebCrypto ECDH key generation applies the `extractable` flag you pass to
// the PRIVATE key only — a generated public key is always exportable
// regardless, since a public key isn't secret. We deliberately still pass
// `true` here (rather than the slightly more hardened `false`) because this
// app supports an optional passphrase-encrypted backup of the private key
// (see createKeyBackup below) for multi-device recovery, which requires
// being able to export it. The trade-off: a script running with same-origin
// access (e.g. an XSS bug) could in principle export it too — but at that
// point it can also just read messages directly off the page, so this
// mainly matters against a narrower threat (e.g. a raw IndexedDB dump
// without live script execution), not against XSS specifically.
const IDENTITY_EXTRACTABLE = true;

interface StoredIdentity {
  scopeKey: string;
  keyPair: IdentityKeyPair;
  createdAt: string;
}

async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: CURVE },
    IDENTITY_EXTRACTABLE,
    ['deriveKey', 'deriveBits']
  )) as CryptoKeyPair;
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', publicKey);
}

async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: CURVE }, true, []);
}

/**
 * Loads this browser's identity key pair for `scopeKey` (use
 * `${tenantId}:${userId}` — see chatCrypto.ts), generating and persisting a
 * new one on first use. Returns whether a NEW key pair was generated so the
 * caller knows to publish the public half to the server
 * (PUT /staffchat/keys/me) — an existing one obviously doesn't need
 * re-publishing every time the page loads.
 */
export async function loadOrCreateIdentity(scopeKey: string): Promise<{ identity: IdentityKeyPair; isNew: boolean }> {
  const stored = await idbGet<StoredIdentity>(scopeKey).catch(() => undefined);
  if (stored?.keyPair) {
    return { identity: stored.keyPair, isNew: false };
  }

  const identity = await generateIdentityKeyPair();
  await idbPut({ scopeKey, keyPair: identity, createdAt: new Date().toISOString() });
  return { identity, isNew: true };
}

// ── ECDH-based wrap/unwrap of a channel's raw symmetric key ─────────────────
// See StaffChannelKey.model.js on the backend for the full protocol writeup.

async function deriveWrappingKey(privateKey: CryptoKey, otherPublicKey: CryptoKey): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: otherPublicKey }, privateKey, 256);
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new ArrayBuffer(0),
      info: toArrayBuffer(new TextEncoder().encode('stayos-staffchat-channel-key-wrap-v1')),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Wraps `rawChannelKey` so only the holder of `recipientPublicKeyJwk`'s matching private key can open it. */
export async function wrapChannelKeyFor(
  rawChannelKey: Uint8Array,
  recipientPublicKeyJwk: JsonWebKey
): Promise<Omit<WrappedKeyDTO, 'memberId'>> {
  // One-time ephemeral pair per wrap — the recipient only needs its public
  // half (sent alongside the wrap) plus their own long-term private key to
  // re-derive the same shared secret; nobody needs the wrapper's identity
  // key for this, which is what lets ANY already-admitted member service a
  // key request, not just whoever originally created the channel.
  const ephemeral = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: CURVE },
    true,
    ['deriveKey', 'deriveBits']
  )) as CryptoKeyPair;

  const recipientPublicKey = await importPublicKeyJwk(recipientPublicKeyJwk);
  const wrappingKey = await deriveWrappingKey(ephemeral.privateKey, recipientPublicKey);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    wrappingKey,
    toArrayBuffer(rawChannelKey)
  );
  const ephemeralPublicKey = await exportPublicKeyJwk(ephemeral.publicKey);

  return { wrappedKey: bufToBase64(ciphertext), iv: bufToBase64(iv), ephemeralPublicKey };
}

/** Reverses wrapChannelKeyFor using my own identity private key. */
export async function unwrapChannelKey(
  wrap: Pick<WrappedKeyDTO, 'wrappedKey' | 'iv' | 'ephemeralPublicKey'>,
  myPrivateKey: CryptoKey
): Promise<Uint8Array> {
  const ephemeralPublicKey = await importPublicKeyJwk(wrap.ephemeralPublicKey);
  const wrappingKey = await deriveWrappingKey(myPrivateKey, ephemeralPublicKey);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(wrap.iv) },
    wrappingKey,
    base64ToBuf(wrap.wrappedKey)
  );
  return new Uint8Array(plainBuf);
}

// ── Optional passphrase-encrypted backup, for multi-device recovery ────────

async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(passphrase)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 210_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts this device's identity private key with a key derived from
 * `passphrase` (PBKDF2, 210k iterations). The server only ever sees the
 * result — it never learns the passphrase and cannot decrypt this itself
 * (see PropertyStaff.model.js#e2ee.backup).
 */
export async function createKeyBackup(identity: IdentityKeyPair, passphrase: string): Promise<KeyBackupDTO> {
  const privateJwk = await crypto.subtle.exportKey('jwk', identity.privateKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const backupKey = await deriveBackupKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(privateJwk));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    backupKey,
    toArrayBuffer(plaintext)
  );
  return { salt: bufToBase64(salt), iv: bufToBase64(iv), ciphertext: bufToBase64(ciphertext) };
}

/**
 * Restores an identity key pair from a backup + the passphrase that created
 * it, and persists it as this browser's identity for `scopeKey` (so it's
 * used from now on, same as a freshly-generated one would be). Throws with
 * message 'Incorrect passphrase' if decryption fails.
 */
export async function restoreKeyBackup(
  scopeKey: string,
  backup: KeyBackupDTO,
  passphrase: string
): Promise<IdentityKeyPair> {
  const salt = new Uint8Array(base64ToBuf(backup.salt));
  const backupKey = await deriveBackupKey(passphrase, salt);

  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuf(backup.iv) },
      backupKey,
      base64ToBuf(backup.ciphertext)
    );
  } catch {
    throw new Error('Incorrect passphrase');
  }

  const privateJwk: JsonWebKey = JSON.parse(new TextDecoder().decode(plainBuf));
  const privateKey = await crypto.subtle.importKey(
    'jwk', privateJwk, { name: 'ECDH', namedCurve: CURVE }, IDENTITY_EXTRACTABLE, ['deriveKey', 'deriveBits']
  );

  // Derive the public JWK from the private one (same x/y/crv/kty, no `d`).
  const { d: _d, key_ops: _ops, ...publicJwk } = privateJwk;
  const publicKey = await crypto.subtle.importKey(
    'jwk', { ...publicJwk, key_ops: [] }, { name: 'ECDH', namedCurve: CURVE }, true, []
  );

  const identity: IdentityKeyPair = { publicKey, privateKey };
  await idbPut({ scopeKey, keyPair: identity, createdAt: new Date().toISOString() });
  return identity;
}
