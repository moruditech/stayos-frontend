'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { useSocketEvent } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { useSession } from '@stayos/auth';
import { getChatCrypto, ChatCrypto } from '@stayos/crypto';

const CATCH_UP_POLL_MS = 30_000;

/**
 * Background service for guest-messaging E2EE, mounted once in the portal
 * layout — not just on /guest-messages — so a staff member working on any
 * other page (Bookings, Housekeeping, wherever) still gets their client
 * checked for pending key requests, instead of only resolving once they
 * happen to open the inbox themselves.
 *
 * This was the gap flagged after the first pass at this feature: the inbox
 * page checked for pending requests only while it itself was open. That's
 * not "shipping broken and fixing later" — it worked correctly whenever
 * the inbox was open — but it meant a request only resolved once someone
 * capable happened to be looking at that specific page, same class of
 * fragility the staff-chat key handoff had. This component removes that
 * dependency the same way ChatKeyResolver would for staff chat: run
 * everywhere the person is logged in, not just on the one page.
 *
 * Two jobs, both delegating to the exact same servicing logic:
 *  1. Live: a 'messaging:key_request' socket broadcast arrives.
 *  2. Catch-up: on mount and every 30s, checks the durable queue
 *     (GET /messaging/key-requests/pending) for anything that arrived
 *     while this device wasn't listening.
 *
 * Also warms the in-memory channel-key cache from EXISTING wraps on load
 * (never bootstraps a new one — that stays tied to a staff member actually
 * opening a specific conversation in the inbox), so this device is able to
 * help immediately rather than only after visiting /guest-messages once.
 *
 * Renders nothing — this is a background service, not UI.
 */
export function GuestMessagingKeyResolver(): null {
  const session = useSession();
  const queryClient = useQueryClient();

  const chatCrypto = useMemo(
    () => (session ? getChatCrypto(session.tenantId ?? '', session.userId) : null),
    [session]
  );

  // Identity is shared with staff chat (one identity per person) — ensure
  // it's loaded and published even if this staff member never opens
  // /chat. No new-device recovery prompt here (that's a staff-chat-specific
  // enhancement, not duplicated for this feature) — a brand-new device
  // just publishes its fresh key, same as staff chat's original behaviour.
  useEffect(() => {
    if (!chatCrypto) return;
    let cancelled = false;
    (async () => {
      const { publicKeyJwk, isNew } = await chatCrypto.ensureIdentity();
      if (isNew) {
        await api.staffchat.setMyPublicKey(publicKeyJwk).catch(() => {});
      }
      if (!cancelled) await warmThreadKeys(chatCrypto);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatCrypto]);

  const serviceRequest = useCallback(
    async (threadId: string, requesterId: string, requesterModel: 'Customer' | 'PropertyStaff', knownPublicKey?: JsonWebKey) => {
      if (!chatCrypto || !chatCrypto.hasChannelKey(threadId)) return;
      try {
        let publicKey = knownPublicKey;
        if (!publicKey) {
          const { members } = await api.messaging.getThreadMembers(threadId);
          publicKey = members.find((m) => m.recipientId === requesterId && m.recipientModel === requesterModel)?.publicKey ?? undefined;
        }
        if (!publicKey) return;
        const wrap = await chatCrypto.wrapCachedKeyFor(threadId, requesterId, publicKey);
        if (wrap) {
          await api.messaging.publishThreadKeys(threadId, [{ ...wrap, recipientModel: requesterModel }]);
          // Prefix match (no filters segment) so this invalidates the
          // threads list regardless of which status filter the inbox page
          // currently has selected — guestMessagingKeys.threads(filters)
          // appends a filters object that would only exact-match if it
          // happened to be identical to whatever the page last used.
          void queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
        }
      } catch {
        // Best-effort — the requester's own retry/catch-up cycle tries again regardless.
      }
    },
    [chatCrypto, queryClient]
  );

  useSocketEvent<{ threadId: string; requesterId: string; requesterModel: 'Customer' | 'PropertyStaff' }>(
    SOCKET_EVENTS.MESSAGING_KEY_REQUEST,
    useCallback(
      (payload) => void serviceRequest(payload.threadId, payload.requesterId, payload.requesterModel),
      [serviceRequest]
    )
  );

  useEffect(() => {
    if (!chatCrypto) return;
    let cancelled = false;

    const checkPending = async (): Promise<void> => {
      try {
        const pending = await api.messaging.getPendingKeyRequests();
        if (cancelled) return;
        for (const req of pending) {
          // eslint-disable-next-line no-await-in-loop -- tiny list, tenant scale
          await serviceRequest(req.threadId, req.requesterId, req.requesterModel, req.requesterPublicKey);
        }
      } catch {
        // Best-effort — next interval tries again.
      }
    };

    void checkPending();
    const interval = setInterval(() => void checkPending(), CATCH_UP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chatCrypto, serviceRequest]);

  return null;
}

/** Loads any EXISTING thread-key wrap this staff member already has — never bootstraps a new one. */
async function warmThreadKeys(chatCrypto: ChatCrypto): Promise<void> {
  try {
    const { data: threads } = await api.messaging.listThreads({ limit: 100 });
    await Promise.all(
      threads.map(async (thread) => {
        if (chatCrypto.hasChannelKey(thread._id)) return;
        try {
          const wrap = await api.messaging.getMyThreadKey(thread._id);
          if (wrap) await chatCrypto.unwrapAndCache(thread._id, wrap);
        } catch {
          // This thread just stays locked until its own bootstrap/request flow runs from the inbox page.
        }
      })
    );
  } catch {
    // Best-effort cache warm — the inbox page's own per-thread flow is the fallback either way.
  }
}
