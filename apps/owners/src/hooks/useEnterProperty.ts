import { useCallback, useState } from 'react';
import { api } from '@stayos/api-client';
import { useSessionContext, setOwnerToken, getActiveToken } from '@stayos/auth';

interface EnterPropertyState {
  loading: boolean;
  error: string | null;
}

/**
 * Owner → property token exchange (Document 02 §6 / Document 12 §5).
 *
 * Flow:
 *   1. Retain current owner-scoped token in ownerToken slot (return trip).
 *   2. Call POST /owner/properties/:id/enter.
 *   3. Swap activeToken to the returned tenant-scoped token.
 *   4. Rebuild session (accessMode + mandateId now reflect the property).
 *   5. Navigate to Property Operations Portal.
 *
 * The Property Operations Portal bootstraps from the refresh cookie the
 * backend rotated on enterProperty — no cross-portal token in the URL.
 *
 * accessMode on the returned token:
 *   'operational'  — no active mandate
 *   'read_only'    — activeMandateId is non-null (backend sets this)
 *   Note: ownerReadOnlyAccess flag is dead code server-side (ticket filed) —
 *   frontend consumes whatever accessMode the token carries.
 */
export function useEnterProperty() {
  const { setSession } = useSessionContext();
  const [state, setState] = useState<EnterPropertyState>({
    loading: false,
    error: null,
  });

  const enterProperty = useCallback(
    async (propertyId: string) => {
      setState({ loading: true, error: null });
      try {
        const currentOwnerToken = getActiveToken();
        if (currentOwnerToken) {
          setOwnerToken(currentOwnerToken);
        }

        const result = await api.owner.enterProperty(propertyId);

        // setSession writes the marker cookie and rebuilds session state
        await setSession(result.accessToken);

        const propertyPortalUrl =
          (import.meta as { env: Record<string, string> }).env['VITE_PROPERTY_PORTAL_URL']
          ?? 'https://app.stayos.co.za';

        window.location.href = `${propertyPortalUrl}/dashboard`;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to enter property';
        setState({ loading: false, error: message });
      }
    },
    [setSession]
  );

  const exitProperty = useCallback(() => {
    // Returning from Property Operations Portal back to the owner portal.
    // The Property Ops portal clears its own session; the owner portal's
    // ownerToken slot still holds the original owner-scoped token.
    // SessionProvider will bootstrap from the refresh cookie on reload.
    const ownerPortalUrl =
      (import.meta as { env: Record<string, string> }).env['VITE_OWNER_PORTAL_URL']
      ?? 'https://owners.stayos.co.za';
    window.location.href = `${ownerPortalUrl}/properties`;
  }, []);

  return { enterProperty, exitProperty, ...state };
}
