import { clearAllTokens } from './token-store';

// POST /auth/logout → clear tokens → clear session → disconnect socket →
// navigate to portal login. If the network call fails, steps 2–4 still
// execute — the frontend does not leave a user "logged in" locally just
// because the logout request didn't reach the server.
export async function performLogout(callbacks: {
  onDisconnect: () => void;
  onNavigate: () => void;
}): Promise<void> {
  try {
    const { api } = await import('@stayos/api-client');
    await api.auth.logout();
  } catch {
    // Network failure — proceed with local cleanup regardless
  } finally {
    clearAllTokens();
    callbacks.onDisconnect();
    callbacks.onNavigate();
  }
}
