import { useCallback, useState } from 'react';
import { api } from '@stayos/api-client';

interface EnterPropertyState {
  loading: boolean;
  error: string | null;
}

/**
 * Agency staff → managed property token exchange (Document 02 §6).
 *
 * The resulting tenant-scoped token is delivered to the Property Operations
 * Portal via a URL query parameter. The Property Ops Portal's SessionProvider
 * reads it once on mount, strips it from the URL with history.replaceState,
 * and immediately writes it to the in-memory token store.
 *
 * Why via URL: the agency and property portals are on different origins
 * (agency.stayos.co.za vs app.stayos.co.za). No shared in-memory store
 * is available. The URL is the correct mechanism for this one-time handoff.
 * It is a short-lived access token (15 min), not a refresh token — the risk
 * profile is acceptable for this use case.
 *
 * The agency-scoped session on agency.stayos.co.za is not disturbed. The
 * agency staff member exits the managed property by closing the Property Ops
 * tab and returning to the agency portal — there is no "exit property" flow
 * on the agency side.
 *
 * Role mapping happens server-side at token issuance — the Property Ops
 * Portal never knows the session originated from agency staff. It reads
 * session.permissions identically to native staff (Document 08 §4).
 * session.isAgencyStaffInProperty is display-only and drives the
 * "Back to Agency Dashboard" header link only.
 */
export function useEnterAgencyProperty() {
  const [state, setState] = useState<EnterPropertyState>({
    loading: false,
    error: null,
  });

  const enterProperty = useCallback(async (propertyId: string) => {
    setState({ loading: true, error: null });
    try {
      const result = await api.agency.enterProperty(propertyId);

      const propertyPortalUrl =
        (import.meta as { env: Record<string, string> }).env['VITE_PROPERTY_PORTAL_URL']
        ?? 'https://app.stayos.co.za';

      // Deliver the token via query param — Property Ops SessionProvider
      // strips it on mount via history.replaceState before doing anything
      // else. Never persisted beyond that single read.
      const url = new URL('/dashboard', propertyPortalUrl);
      url.searchParams.set('propertyToken', result.accessToken);
      window.location.href = url.toString();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enter property';
      setState({ loading: false, error: message });
    }
  }, []);

  return { enterProperty, ...state };
}
