// In-memory only — never localStorage or sessionStorage.
// The single documented exception (white-label custom-domain Owner Portal)
// is handled by SessionProvider using sessionStorage when an env variable
// signals custom-domain mode. That is not a pattern to reach for elsewhere.
//
// Two slots:
//   activeToken — the token attached to every API request. Set on login
//     for all scopes; for owner sessions it starts as the owner token,
//     then is replaced by a tenant-scoped token after entering a property.
//   ownerToken  — owner-scoped JWT retained across property entry/exit so
//     the owner can return to the property picker without re-authenticating.
//     Never read by the api-client; it exists for the multi-token context
//     described in Document 02 §3.

let activeToken: string | null = null;
let ownerToken: string | null = null;

export function getActiveToken(): string | null {
  return activeToken;
}

export function setActiveToken(token: string | null): void {
  activeToken = token;
}

export function getOwnerToken(): string | null {
  return ownerToken;
}

export function setOwnerToken(token: string | null): void {
  ownerToken = token;
}

export function clearAllTokens(): void {
  activeToken = null;
  ownerToken = null;
}
