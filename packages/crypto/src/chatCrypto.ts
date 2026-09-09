import { loadOrCreateIdentity, exportPublicKeyJwk, wrapChannelKeyFor, unwrapChannelKey, createKeyBackup, restoreKeyBackup } from './identity';
import { generateChannelKey, exportChannelKeyRaw, importChannelKeyRaw, encryptMessage, decryptMessage } from './message';
import type { IdentityKeyPair, WrappedKeyDTO, EncryptedEnvelope, MessagePayload, KeyBackupDTO } from './types';

/**
 * One ChatCrypto instance per (tenant, user) — see getChatCrypto() below.
 * Holds the identity key pair (loaded once) and an in-memory cache of
 * unwrapped channel keys. The channel key cache is intentionally
 * memory-only and never persisted: it's cheap to re-derive (one ECDH +
 * AES-GCM decrypt) from the stored wrap, and keeping raw channel keys out
 * of any persistent store is a normal precaution — the wraps in
 * StaffChannelKey are what's expensive/scarce (they require another
 * member's help to re-create), not the derived cache.
 */
export class ChatCrypto {
  private identity: IdentityKeyPair | null = null;
  private channelKeys = new Map<string, CryptoKey>();

  constructor(private readonly scopeKey: string) {}

  /** Call once on chat mount. Returns the public key to publish if this is a brand-new identity. */
  async ensureIdentity(): Promise<{ publicKeyJwk: JsonWebKey; isNew: boolean }> {
    const { identity, isNew } = await loadOrCreateIdentity(this.scopeKey);
    this.identity = identity;
    return { publicKeyJwk: await exportPublicKeyJwk(identity.publicKey), isNew };
  }

  hasIdentity(): boolean {
    return this.identity !== null;
  }

  private requireIdentity(): IdentityKeyPair {
    if (!this.identity) throw new Error('ChatCrypto: call ensureIdentity() first');
    return this.identity;
  }

  hasChannelKey(channelId: string): boolean {
    return this.channelKeys.has(channelId);
  }

  cacheChannelKey(channelId: string, key: CryptoKey): void {
    this.channelKeys.set(channelId, key);
  }

  /** Drops a channel's cached key — used when a bootstrap attempt loses a race, or membership changes force a rekey. */
  clearChannelKey(channelId: string): void {
    this.channelKeys.delete(channelId);
  }

  /**
   * Generates a brand-new channel key and wraps it for every given member's
   * public key. Does NOT cache it under a channelId — the caller does that
   * (via cacheChannelKey) only once it knows the bootstrap attempt actually
   * won (see StaffChannel.model.js#keyBootstrappedAt / the ALREADY_BOOTSTRAPPED
   * response), so a losing attempt never leaves a wrong key cached.
   */
  async generateAndWrapNewKey(
    members: { staffId: string; publicKey: JsonWebKey | null }[]
  ): Promise<{ key: CryptoKey; wraps: WrappedKeyDTO[] }> {
    const key = await generateChannelKey();
    const raw = await exportChannelKeyRaw(key);

    const wraps: WrappedKeyDTO[] = [];
    for (const member of members) {
      if (!member.publicKey) continue; // no key on file yet — they'll get it via key-request once they do
      const wrap = await wrapChannelKeyFor(raw, member.publicKey);
      wraps.push({ memberId: member.staffId, ...wrap });
    }
    return { key, wraps };
  }

  /** Wraps the ALREADY-CACHED channel key for one specific member (servicing a key request). Returns null if we don't hold the key. */
  async wrapCachedKeyFor(channelId: string, memberId: string, memberPublicKey: JsonWebKey): Promise<WrappedKeyDTO | null> {
    const key = this.channelKeys.get(channelId);
    if (!key) return null;
    const raw = await exportChannelKeyRaw(key);
    const wrap = await wrapChannelKeyFor(raw, memberPublicKey);
    return { memberId, ...wrap };
  }

  /** Unwraps a channel key using my identity private key and caches it. */
  async unwrapAndCache(channelId: string, wrap: Pick<WrappedKeyDTO, 'wrappedKey' | 'iv' | 'ephemeralPublicKey'>): Promise<void> {
    const identity = this.requireIdentity();
    const raw = await unwrapChannelKey(wrap, identity.privateKey);
    this.channelKeys.set(channelId, await importChannelKeyRaw(raw));
  }

  async encryptForChannel(channelId: string, payload: MessagePayload): Promise<EncryptedEnvelope | null> {
    const key = this.channelKeys.get(channelId);
    if (!key) return null;
    return encryptMessage(key, payload);
  }

  /** Returns null (rather than throwing) on any failure — wrong/missing key, corrupted data — so the UI can show a placeholder. */
  async decryptForChannel(channelId: string, envelope: EncryptedEnvelope): Promise<MessagePayload | null> {
    const key = this.channelKeys.get(channelId);
    if (!key) return null;
    try {
      return await decryptMessage(key, envelope);
    } catch {
      return null;
    }
  }

  async createBackup(passphrase: string): Promise<KeyBackupDTO> {
    return createKeyBackup(this.requireIdentity(), passphrase);
  }

  async restoreFromBackup(backup: KeyBackupDTO, passphrase: string): Promise<void> {
    this.identity = await restoreKeyBackup(this.scopeKey, backup, passphrase);
    this.channelKeys.clear(); // stale under the old (now-replaced) identity
  }
}

const instances = new Map<string, ChatCrypto>();

/** Memoized per (tenantId, userId) so the channel-key cache survives component remounts within a tab session. */
export function getChatCrypto(tenantId: string, userId: string): ChatCrypto {
  const scopeKey = `${tenantId}:${userId}`;
  let instance = instances.get(scopeKey);
  if (!instance) {
    instance = new ChatCrypto(scopeKey);
    instances.set(scopeKey, instance);
  }
  return instance;
}
