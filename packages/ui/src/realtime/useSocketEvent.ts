'use client';

import { useEffect } from 'react';
import { useSocketInstance } from './SocketProvider';

/**
 * Subscribe to a socket event for the lifetime of the mounted component.
 *
 * The handler's only permitted job is invalidating a React Query key —
 * it must never hold a copy of the payload in local component state.
 * Invalidate and let the data layer refetch: one source of truth for
 * what's on screen, whether it arrived via initial fetch or a push.
 *
 * Event name must be a SOCKET_EVENTS value from @stayos/constants —
 * never a literal string. An unconfirmed name that doesn't match the
 * backend's actual emit literal fails silently (no error, handler never
 * fires). See @stayos/constants/src/socket-events.ts.
 *
 * @example
 * useSocketEvent(SOCKET_EVENTS.BOOKING_CREATED, () => {
 *   queryClient.invalidateQueries({ queryKey: bookingKeys.list(filters) });
 * });
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void
): void {
  const socket = useSocketInstance();

  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
