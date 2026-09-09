export function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000; // chunked to avoid call-stack limits on the spread below
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return bytes.buffer;
}

/**
 * Copies a Uint8Array's bytes into a plain, freshly-allocated ArrayBuffer.
 * WebCrypto's TypeScript types (BufferSource) want an ArrayBufferView backed
 * specifically by ArrayBuffer, not the more general ArrayBufferLike that a
 * typed array's `.buffer` is typed as — this sidesteps that without caring
 * which TypeScript/lib.dom version is in play. `.slice()` on Uint8Array
 * returns a Uint8Array; take `.buffer` off THAT (guaranteed exactly sized,
 * not a shared/offset view) to get back to ArrayBuffer.
 */
export function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.slice().buffer as ArrayBuffer;
}
