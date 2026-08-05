'use client';

import { useCallback } from 'react';
import { useSocketInstance } from './SocketProvider';

/**
 * Returns a stable emit function for the active socket connection.
 * Client-originated emits are rare — most state changes go via REST
 * mutation and the resulting broadcast is handled server-side. Use this
 * only for the narrower cases where a direct emit is correct (typing
 * indicators, presence signals).
 *
 * Returns a no-op if no socket is connected — callers do not need to
 * guard against a null socket themselves.
 */
export function useEmit(): (event: string, payload?: unknown) => void {
  const socket = useSocketInstance();

  return useCallback(
    (event: string, payload?: unknown) => {
      socket?.emit(event, payload);
    },
    [socket]
  );
}
