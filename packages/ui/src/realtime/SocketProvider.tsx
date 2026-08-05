'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from '@stayos/auth';
import { SCOPES } from '@stayos/constants';

// Namespace per scope — verified against Document 05 §2
const NAMESPACE_FOR_SCOPE: Record<string, string> = {
  [SCOPES.PLATFORM]: '/platform',
  [SCOPES.AGENCY]: '/agency',
  [SCOPES.TENANT]: '/property',
  [SCOPES.OWNER]: '/property', // owner with tenant token after entering a property
  [SCOPES.CUSTOMER]: '/customer',
};

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

interface SocketProviderProps {
  children: React.ReactNode;
  /**
   * Base URL of the Socket.IO server. Typically the same host as the API.
   * Injected per-app via environment variable.
   */
  serverUrl: string;
  /**
   * Called on disconnect/refresh-failure cleanup — matches the pattern
   * used in SessionProvider so the same onDisconnect callback propagates
   * through the portal layout.
   */
  onDisconnect?: () => void;
}

/**
 * Manages one Socket.IO connection for the mounted portal.
 *
 * Rules:
 * - Connects only after a resolved session with a non-null activeToken.
 * - Authenticates via the JWT in the socket handshake auth object —
 *   namespace-level authorization on the backend mirrors checkScope.
 * - A customer-scoped token cannot connect to /property (and vice versa);
 *   the server rejects the handshake.
 * - On logout or refresh failure the socket is explicitly disconnected —
 *   it does not wait for a natural connection drop.
 * - io() is never called outside this provider. Components subscribe via
 *   useSocketEvent() only.
 * - NOTE: property_manager is not joined to the :fd room server-side
 *   (confirmed gap in property.socket.js — backend ticket filed). This
 *   is NOT worked around client-side; the room-join is server-authorised
 *   and cannot be patched here. Front-desk real-time updates will appear
 *   stale for property_manager sessions until the backend fix lands.
 */
export function SocketProvider({
  children,
  serverUrl,
  onDisconnect,
}: SocketProviderProps): React.ReactElement {
  const session = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.activeToken) return;

    const namespace = NAMESPACE_FOR_SCOPE[session.scope];
    if (!namespace) return;

    const socket = io(`${serverUrl}${namespace}`, {
      auth: { token: session.activeToken },
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server-initiated disconnect — likely an auth failure or token
        // revocation. Surface to the portal layout.
        onDisconnect?.();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // Re-connect when the active token changes (owner entering/exiting a property)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.activeToken, session?.scope, serverUrl]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketInstance(): Socket | null {
  return useContext(SocketContext).socket;
}
