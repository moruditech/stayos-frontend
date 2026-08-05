'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Session } from '@stayos/types';
import { SCOPES } from '@stayos/constants';
import {
  getActiveToken,
  setActiveToken,
  setOwnerToken,
  getOwnerToken,
  clearAllTokens,
} from './token-store';
import { decodeToken, isTokenExpired } from './decode';
import { resolvePermissions } from './permissions';
import { isAgencyStaffInProperty } from './agency-context';
import { writeMarkerCookie, clearMarkerCookie } from './marker-cookie';
import {
  setTokenGetter,
  setTenantIdGetter,
  setRefreshCallback,
  ApiError,
} from '@stayos/api-client';

// ── Session context ────────────────────────────────────────────────────────────

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  clearSession: () => void;
  // Used by property-entry flows (owner enters property, agency callback)
  // to swap the active token and rebuild session without a full re-mount.
  setSession: (token: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ── Shared refresh in-flight guard ─────────────────────────────────────────────
let refreshInFlight: Promise<void> | null = null;

const NO_RETRY_CODES = new Set(['TOKEN_REVOKED', 'TOKEN_INVALID']);

// ── SessionProvider ────────────────────────────────────────────────────────────

interface SessionProviderProps {
  children: React.ReactNode;
  portalUserType: 'platform' | 'agency' | 'property' | 'customer' | 'owner';
  /**
   * Custom-domain exception (Document 02 §9): when true the refresh token
   * is read from sessionStorage instead of the HttpOnly cookie. Only for
   * Owner Portal on a white-label domain. Not a pattern to use elsewhere.
   */
  customDomain?: boolean;
  onUnauthenticated: (redirectPath?: string) => void;
  onDisconnect?: () => void;
}

export function SessionProvider({
  children,
  onUnauthenticated,
  onDisconnect,
}: SessionProviderProps): React.ReactElement {
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const bootstrappedRef = useRef(false);

  // ── Build a Session from a raw access token ──────────────────────────────
  const buildSession = useCallback(async (token: string): Promise<Session | null> => {
    const decoded = decodeToken(token);
    if (!decoded) return null;

    const permissions = resolvePermissions(
      decoded.role,
      decoded.grantedPermissions,
      decoded.deniedPermissions
    );

    let features: string[] = [];

    if (decoded.scope === SCOPES.TENANT && decoded.tenantId) {
      try {
        // Dynamic import avoids a top-level circular import:
        // api-client → (injected getter) → auth → api-client
        const { api } = await import('@stayos/api-client');
        const bootstrap = await api.tenants.getMe();
        features = bootstrap.planId.features;
      } catch {
        // Non-fatal — PlanGate shows locked for all features until resolved
        features = [];
      }
    }

    return {
      userId: decoded.userId,
      scope: decoded.scope,
      role: decoded.role,
      tenantId: decoded.tenantId,
      agencyId: decoded.agencyId,
      mandateId: decoded.mandateId,
      accessMode: decoded.accessMode,
      isAgencyStaffInProperty: isAgencyStaffInProperty(token),
      permissions,
      features,
      activeToken: token,
    };
  }, []);

  // ── POST /auth/refresh ────────────────────────────────────────────────────
  const doRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const { api } = await import('@stayos/api-client');
      const { accessToken } = await api.auth.refresh();
      return accessToken;
    } catch {
      return null;
    }
  }, []);

  // ── Shared refresh function injected into api-client ──────────────────────
  const sharedRefresh = useCallback(async (): Promise<void> => {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const newToken = await doRefresh();
      if (newToken) {
        setActiveToken(newToken);
        writeMarkerCookie(decodeToken(newToken)?.scope ?? '');
      } else {
        clearAllTokens();
        clearMarkerCookie();
        setSessionState(null);
        onDisconnect?.();
        onUnauthenticated();
      }
    })().finally(() => { refreshInFlight = null; });
    return refreshInFlight;
  }, [doRefresh, onUnauthenticated, onDisconnect]);

  // ── Public setSession — used by property-entry flows ──────────────────────
  const setSession = useCallback(async (token: string): Promise<void> => {
    setActiveToken(token);
    writeMarkerCookie(decodeToken(token)?.scope ?? '');
    const built = await buildSession(token);
    setSessionState(built);
  }, [buildSession]);

  // ── clearSession — used by logout and refresh failure ─────────────────────
  const clearSession = useCallback((): void => {
    clearAllTokens();
    clearMarkerCookie();
    setSessionState(null);
    onDisconnect?.();
  }, [onDisconnect]);

  // ── Bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    // Wire api-client getters before any request fires
    setTokenGetter(getActiveToken);
    setTenantIdGetter(() => decodeToken(getActiveToken())?.tenantId ?? null);
    setRefreshCallback(sharedRefresh);

    (async () => {
      setIsLoading(true);
      try {
        // ── Google OAuth callback: token arrives in URL query param ─────────
        // The backend redirects to /auth/callback?token=<accessToken> after
        // a successful OAuth flow. Read it once and immediately strip the URL.
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const oauthToken = params.get('token');
          if (oauthToken && window.location.pathname === '/auth/callback') {
            params.delete('token');
            const cleanUrl = [
              window.location.pathname,
              params.toString() ? `?${params.toString()}` : '',
            ].join('');
            window.history.replaceState(null, '', cleanUrl);
            setActiveToken(oauthToken);
            // OAuth is always customer scope for the customer portal
            writeMarkerCookie(decodeToken(oauthToken)?.scope ?? '');
            const built = await buildSession(oauthToken);
            if (built) {
              setSessionState(built);
              setIsLoading(false);
              return;
            }
          }

          // ── Agency staff returning from property entry ──────────────────
          // The agency portal redirects to /auth/property-callback?token=<token>
          // (see useEnterProperty hook). Read once, strip URL.
          const agencyToken = params.get('propertyToken');
          if (agencyToken) {
            params.delete('propertyToken');
            const cleanUrl = [
              window.location.pathname,
              params.toString() ? `?${params.toString()}` : '',
            ].join('');
            window.history.replaceState(null, '', cleanUrl);
            setActiveToken(agencyToken);
            writeMarkerCookie(decodeToken(agencyToken)?.scope ?? '');
            const built = await buildSession(agencyToken);
            if (built) {
              setSessionState(built);
              setIsLoading(false);
              return;
            }
          }
        }

        let token = getActiveToken();

        // No in-memory token (e.g. hard reload) — attempt refresh via cookie
        if (!token || isTokenExpired(token)) {
          const refreshed = await doRefresh();
          if (!refreshed) {
            clearMarkerCookie();
            onUnauthenticated();
            return;
          }
          token = refreshed;
          setActiveToken(token);

          // Owner scope: also populate the ownerToken slot on bootstrap
          const decoded = decodeToken(token);
          if (decoded?.scope === SCOPES.OWNER) {
            setOwnerToken(token);
          }
        }

        writeMarkerCookie(decodeToken(token)?.scope ?? '');

        const built = await buildSession(token);
        if (!built) {
          clearMarkerCookie();
          onUnauthenticated();
          return;
        }
        setSessionState(built);
      } catch (err) {
        clearMarkerCookie();
        if (err instanceof ApiError && NO_RETRY_CODES.has(err.code)) {
          clearAllTokens();
        }
        onUnauthenticated();
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading, clearSession, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSession(): Session | null {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession() must be used within a SessionProvider');
  return ctx.session;
}

export function useSessionLoading(): boolean {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionLoading() must be used within a SessionProvider');
  return ctx.isLoading;
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext() must be used within a SessionProvider');
  return ctx;
}
