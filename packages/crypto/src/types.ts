// These mirror the wire shapes in stayos-api-main's staffchat module
// (StaffChannelKey.model.js / staffchat.validation.js) — kept here rather
// than imported from api-client so this package has zero dependency on the
// rest of the frontend and can be unit-tested in isolation.

/** A member's wrapped copy of a channel's symmetric content key. */
export interface WrappedKeyDTO {
  memberId: string;
  wrappedKey: string;           // base64 AES-GCM ciphertext of the raw channel key
  iv: string;                   // base64, 12 bytes
  ephemeralPublicKey: JsonWebKey;
}

/** An encrypted message body as stored/transmitted by the API. */
export interface EncryptedEnvelope {
  ciphertext: string; // base64
  iv: string;          // base64, 12 bytes
}

/** The plaintext shape encrypted into every message's envelope. */
export interface MessagePayload {
  text: string;
  attachments?: { url: string; name: string }[];
}

/** A user's own long-term ECDH identity key pair. */
export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/** Passphrase-encrypted backup of an identity private key. */
export interface KeyBackupDTO {
  salt: string;       // base64, PBKDF2 salt
  iv: string;          // base64, AES-GCM nonce
  ciphertext: string; // base64, encrypted private key JWK
}
