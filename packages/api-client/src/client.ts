import type { ApiErrorPayload, ApiResponse, Pagination } from '@stayos/types';

// Re-exported for consumers to narrow catch() blocks without importing
// from @stayos/types directly.
export class ApiError extends Error {
  readonly code: string;
  readonly fields?: { field: string; message: string }[] | undefined;
  readonly requestId: string;
  readonly status: number;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.fields = payload.fields;
    this.requestId = payload.requestId;
    this.status = status;
  }
}

// ── Token attachment ──────────────────────────────────────────────────────────
// Injected at runtime by packages/auth; set via setTokenGetter() before the
// client is used. The api-client never imports @stayos/auth directly —
// that would create a circular dependency (auth imports api-client for the
// session bootstrap call). The getter pattern breaks the cycle.
let getAccessToken: (() => string | null) | null = null;
let getTenantId: (() => string | null) | null = null;

export function setTokenGetter(fn: () => string | null): void {
  getAccessToken = fn;
}

export function setTenantIdGetter(fn: () => string | null): void {
  getTenantId = fn;
}

// ── Refresh callback ──────────────────────────────────────────────────────────
// Injected by packages/auth's SessionProvider. When near-expiry is detected
// the client calls this, awaiting the shared in-flight promise if one is
// already pending. Set via setRefreshCallback().
let refreshCallback: (() => Promise<void>) | null = null;

export function setRefreshCallback(fn: () => Promise<void>): void {
  refreshCallback = fn;
}

// ── Shared in-flight refresh guard ────────────────────────────────────────────
let refreshPromise: Promise<void> | null = null;

async function ensureFreshToken(): Promise<void> {
  if (!refreshCallback) return;
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshCallback().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// ── Error codes that must never trigger a retry ───────────────────────────────
// TOKEN_REVOKED and TOKEN_INVALID mean the token is dead by server decision,
// not by clock — retrying wastes a round trip. TOKEN_EXPIRED and NO_TOKEN
// mean the refresh cookie may still be valid; those retry via ensureFreshToken.
const NO_RETRY_CODES = new Set(['TOKEN_REVOKED', 'TOKEN_INVALID']);

// This package is consumed by both Vite apps (agency, admin) and Next.js
// apps (property, customer, owners, public) — it can't assume either
// bundler's ambient globals package-wide. `process` is declared locally as
// an ambient type-only fallback for the Next.js branch below; at runtime in
// a Vite app this branch is never reached (import.meta.env is always
// truthy under Vite), so no real Node dependency is introduced here.
declare const process: { env?: Record<string, string | undefined> } | undefined;

// ── Core request function ─────────────────────────────────────────────────────
const BASE_URL = (import.meta as unknown as Record<string, unknown>)['env']
  ? (import.meta as unknown as { env: Record<string, string> }).env['VITE_API_URL']
  : process?.env?.['NEXT_PUBLIC_API_URL'] ?? '';

async function requestEnvelope<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined> | undefined;
    signal?: AbortSignal | undefined;
    isRetry?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const { body, params, signal, isRetry = false } = options;

  // Step 1 — refresh before request if near expiry (Document 02 §5)
  if (!isRetry) {
    await ensureFreshToken();
  }

  // Step 2 — build URL with query string
  const url = new URL(`${BASE_URL}/api/v1${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  // Step 3 — build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAccessToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const tenantId = getTenantId?.();
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  // Step 4 — issue request
  const response = await fetch(url.toString(), {
    method,
    headers,
    credentials: 'include', // browser attaches HttpOnly refresh cookie on /auth/* paths
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  // Step 5 — parse envelope
  const envelope = (await response.json()) as
    | ApiResponse<T>
    | { success: false; error: ApiErrorPayload };

  if (envelope.success === true) {
    return envelope;
  }

  const err = new ApiError(envelope.error, response.status);

  // Step 6 — one refresh-and-retry cycle for token expiry (Document 04 §3)
  if (
    !isRetry &&
    (response.status === 401) &&
    !NO_RETRY_CODES.has(err.code)
  ) {
    await ensureFreshToken();
    return requestEnvelope<T>(method, path, { ...options, isRetry: true });
  }

  throw err;
}

async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined> | undefined;
    signal?: AbortSignal | undefined;
    isRetry?: boolean;
  } = {}
): Promise<T> {
  const envelope = await requestEnvelope<T>(method, path, options);
  return envelope.data;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: Pagination;
}

// A handful of paginated list routes were built before this envelope's
// pagination object had a confirmed field name (see @stayos/types api.ts —
// it is `meta`, not `pagination`) and so ship a best-effort default when a
// backend response omits it entirely (defensive, not expected in practice).
const EMPTY_META: Pagination = { total: 0, page: 1, limit: 20, totalPages: 0 };

// ── Public HTTP helpers ───────────────────────────────────────────────────────
export const client = {
  get<T>(
    path: string,
    options?: {
      params?: Record<string, string | number | boolean | undefined> | undefined;
      signal?: AbortSignal | undefined;
    }
  ): Promise<T> {
    return request<T>('GET', path, options);
  },

  /**
   * For paginated list endpoints — returns { data, meta } instead of just
   * the array, so DataTable/Pagination (packages/ui) have something to
   * render. T here is the item type, not the array.
   */
  async getPaginated<T>(
    path: string,
    options?: {
      params?: Record<string, string | number | boolean | undefined> | undefined;
      signal?: AbortSignal | undefined;
    }
  ): Promise<PaginatedResult<T>> {
    const envelope = await requestEnvelope<T[]>('GET', path, options);
    return { data: envelope.data, meta: envelope.meta ?? EMPTY_META };
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal | undefined }
  ): Promise<T> {
    return request<T>('POST', path, { body, ...options });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal | undefined }
  ): Promise<T> {
    return request<T>('PATCH', path, { body, ...options });
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal | undefined }
  ): Promise<T> {
    return request<T>('PUT', path, { body, ...options });
  },

  delete<T>(
    path: string,
    options?: { signal?: AbortSignal | undefined }
  ): Promise<T> {
    return request<T>('DELETE', path, options);
  },

  /**
   * For authenticated file downloads (statement PDFs, lease documents, etc).
   * A plain <a href="/api/v1/..."> can't carry the in-memory Authorization
   * header this app relies on (no cookie-based auth), so the request has to
   * go through fetch() directly. Returns an object URL — the caller revokes
   * it after triggering the download (DownloadButton's href-as-function
   * support handles this pattern already).
   */
  async getBlobUrl(path: string): Promise<string> {
    await ensureFreshToken();
    const token = getAccessToken?.();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const tenantId = getTenantId?.();
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const response = await fetch(`${BASE_URL}/api/v1${path}`, { headers, credentials: 'include' });
    if (!response.ok) {
      throw new ApiError(
        { code: 'DOWNLOAD_FAILED', message: 'Could not download this file', requestId: '' },
        response.status
      );
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};
