import { bufToBase64, base64ToBuf, toArrayBuffer } from './base64';
import type { EncryptedEnvelope, MessagePayload } from './types';

/** A brand-new random channel content key. Extractable so it can be exported raw and wrapped per member. */
export async function generateChannelKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportChannelKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}

export async function importChannelKeyRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export async function encryptMessage(channelKey: CryptoKey, payload: MessagePayload): Promise<EncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    channelKey,
    toArrayBuffer(plaintext)
  );
  return { ciphertext: bufToBase64(ciphertext), iv: bufToBase64(iv) };
}

/** Throws if the envelope can't be decrypted with this key (wrong/missing key, corrupted data). */
export async function decryptMessage(channelKey: CryptoKey, envelope: EncryptedEnvelope): Promise<MessagePayload> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(envelope.iv) },
    channelKey,
    base64ToBuf(envelope.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plainBuf));
}
