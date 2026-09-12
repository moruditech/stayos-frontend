'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api, ApiError } from '@stayos/api-client';
import type { GuestThreadDTO, GuestThreadMessageDTO, GuestThreadWrappedKeyDTO } from '@stayos/api-client';
import { useSocketEvent } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { getChatCrypto } from '@stayos/crypto';
import type { MessagePayload } from '@stayos/crypto';

type KeyState = 'idle' | 'checking' | 'ready' | 'waiting' | 'error';

export interface DisplayMessage extends GuestThreadMessageDTO {
  displayText: string;
}

interface UseGuestThreadChatOptions {
  queryKey: QueryKey;
  fetchThread: () => Promise<GuestThreadDTO>;
  sendMessage: (envelope: { ciphertext: string; iv: string }) => Promise<GuestThreadDTO>;
}

/**
 * Shared by both /bookings/[id]/chat and /applications/[id]/chat — same
 * GuestThread, same encryption, just a different fetch/send pair and query
 * key depending on which parent record the customer got here from. See
 * @stayos/crypto for the actual encrypt/decrypt/key-wrap engine (the same
 * one property staff's chat page and this use, applied to a GuestThread
 * instead of a StaffChannel).
 *
 * A customer's identity key is scoped to them alone, not per-property —
 * `getChatCrypto('customer', session.userId)` — since the same person may
 * message several different properties, each with its own separately
 * wrapped thread key under that one identity.
 */
export function useGuestThreadChat({ queryKey, fetchThread, sendMessage }: UseGuestThreadChatOptions) {
  const session = useSession();
  const qc = useQueryClient();

  const [identityReady, setIdentityReady] = useState(false);
  const [keyState, setKeyState] = useState<KeyState>('idle');
  const [decrypted, setDecrypted] = useState<Record<string, MessagePayload | null>>({});
  const [sendError, setSendError] = useState<string | null>(null);

  const chatCrypto = useMemo(() => (session ? getChatCrypto('customer', session.userId) : null), [session]);

  const { data: thread, isLoading } = useQuery({
    queryKey,
    queryFn: fetchThread,
    enabled: !!session,
    // The property may reply while this screen is open — a light poll is a
    // reasonable fallback alongside the socket push, in case a connection
    // drops without the socket noticing right away.
    refetchInterval: 15000,
  });

  const threadId = thread?._id;

  // ── Identity bootstrap ───────────────────────────────────────────────────
  useEffect(() => {
    if (!chatCrypto) return;
    let cancelled = false;
    (async () => {
      const { publicKeyJwk, isNew } = await chatCrypto.ensureIdentity();
      if (isNew) {
        await api.customer.setMyPublicKey(publicKeyJwk).catch(() => {});
      }
      if (!cancelled) setIdentityReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatCrypto]);

  // ── Establish (or request) this thread's content key ────────────────────
  const ensureThreadKey = useCallback(async () => {
    if (!chatCrypto || !threadId) return;
    if (chatCrypto.hasChannelKey(threadId)) {
      setKeyState('ready');
      return;
    }

    setKeyState('checking');
    try {
      const wrap = await api.customer.getMyThreadKey(threadId);
      if (wrap) {
        await chatCrypto.unwrapAndCache(threadId, wrap);
        setKeyState('ready');
        return;
      }

      const { members, channelHasKey } = await api.customer.getMyThreadMembers(threadId);

      if (!channelHasKey) {
        const { key, wraps } = await chatCrypto.generateAndWrapNewKey(
          members.map((m) => ({ memberId: m.recipientId, publicKey: m.publicKey }))
        );
        if (wraps.length) {
          const wrapsWithModel: GuestThreadWrappedKeyDTO[] = wraps.map((w) => ({
            recipientId: w.memberId,
            recipientModel: members.find((m) => m.recipientId === w.memberId)?.recipientModel ?? 'PropertyStaff',
            wrappedKey: w.wrappedKey,
            iv: w.iv,
            ephemeralPublicKey: w.ephemeralPublicKey,
          }));
          try {
            await api.customer.publishMyThreadKeys(threadId, wrapsWithModel, true);
            chatCrypto.cacheChannelKey(threadId, key);
            setKeyState('ready');
            return;
          } catch (err) {
            if (!(err instanceof ApiError) || err.code !== 'ALREADY_BOOTSTRAPPED') throw err;
            // Someone else (staff, most likely) won the race to establish
            // this thread's key a moment before we did — ask for it instead.
          }
        }
      }

      setKeyState('waiting');
      await api.customer.requestMyThreadKey(threadId).catch(() => {});
    } catch {
      setKeyState('error');
    }
  }, [chatCrypto, threadId]);

  useEffect(() => {
    if (!threadId || !identityReady) return;
    void ensureThreadKey();
  }, [threadId, identityReady, ensureThreadKey]);

  // Auto-retry while waiting — durable on the server (GuestThreadKeyRequest
  // persists), this just means the screen resolves itself once someone
  // capable connects, instead of requiring a manual reload.
  useEffect(() => {
    if (keyState !== 'waiting') return;
    const interval = setInterval(() => void ensureThreadKey(), 20_000);
    return () => clearInterval(interval);
  }, [keyState, ensureThreadKey]);

  // ── Service staff's key requests for THIS thread while it's open ────────
  // A customer typically has this one thread in view at a time (unlike
  // staff, who may hold dozens across many guests) — so there's no need
  // for an app-wide background resolver, just handling it here covers the
  // realistic case.
  const serviceRequest = useCallback(
    async (requesterId: string, requesterModel: 'Customer' | 'PropertyStaff', knownPublicKey?: JsonWebKey) => {
      if (!chatCrypto || !threadId || !chatCrypto.hasChannelKey(threadId)) return;
      try {
        let publicKey = knownPublicKey;
        if (!publicKey) {
          const { members } = await api.customer.getMyThreadMembers(threadId);
          publicKey = members.find((m) => m.recipientId === requesterId && m.recipientModel === requesterModel)?.publicKey ?? undefined;
        }
        if (!publicKey) return;
        const wrap = await chatCrypto.wrapCachedKeyFor(threadId, requesterId, publicKey);
        if (wrap) {
          await api.customer.publishMyThreadKeys(threadId, [{ ...wrap, recipientModel: requesterModel }]);
        }
      } catch {
        // Best-effort — the requester's own retry/catch-up cycle tries again regardless.
      }
    },
    [chatCrypto, threadId]
  );

  useSocketEvent<{ threadId: string; requesterId: string; requesterModel: 'Customer' | 'PropertyStaff' }>(
    SOCKET_EVENTS.MESSAGING_KEY_REQUEST,
    useCallback(
      (payload) => {
        if (payload.threadId !== threadId) return;
        void serviceRequest(payload.requesterId, payload.requesterModel);
      },
      [threadId, serviceRequest]
    )
  );

  useSocketEvent<{ threadId: string }>(
    SOCKET_EVENTS.MESSAGING_KEY_GRANTED,
    useCallback(
      (payload) => {
        if (payload.threadId !== threadId) return;
        void ensureThreadKey();
      },
      [threadId, ensureThreadKey]
    )
  );

  // Catch-up: covers a request that arrived while this page was closed.
  useEffect(() => {
    if (!chatCrypto || !threadId) return;
    let cancelled = false;
    (async () => {
      try {
        const pending = await api.customer.getMyPendingKeyRequests();
        if (cancelled) return;
        for (const req of pending.filter((r) => r.threadId === threadId)) {
          // eslint-disable-next-line no-await-in-loop -- tiny list, one thread's worth
          await serviceRequest(req.requesterId, req.requesterModel, req.requesterPublicKey);
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatCrypto, threadId, serviceRequest]);

  useSocketEvent<{ threadId: string }>(
    SOCKET_EVENTS.MESSAGING_NEW_MESSAGE,
    useCallback(() => void qc.invalidateQueries({ queryKey }), [qc, queryKey])
  );

  const rawMessages = useMemo(
    () =>
      (thread?.messages ?? [])
        .slice()
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
    [thread]
  );

  // ── Decrypt as messages arrive / the key becomes ready ───────────────────
  useEffect(() => {
    if (!chatCrypto || !threadId) return;
    const pending = rawMessages.filter((m) => m.encrypted && !(m._id in decrypted));
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, MessagePayload | null> = {};
      for (const msg of pending) {
        updates[msg._id] = await chatCrypto.decryptForChannel(threadId, {
          ciphertext: msg.ciphertext ?? '',
          iv: msg.iv ?? '',
        });
      }
      if (!cancelled) setDecrypted((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
    // `decrypted` intentionally excluded — see the equivalent note in the
    // property staff chat page; this effect's own update is the only thing
    // that would change it.
  }, [rawMessages, chatCrypto, threadId, keyState]);

  const messages: DisplayMessage[] = rawMessages.map((m) => {
    if (!m.encrypted) return { ...m, displayText: m.body ?? '' };
    const payload = decrypted[m._id];
    if (payload === undefined) return { ...m, displayText: '…' };
    if (payload === null) return { ...m, displayText: '' }; // caller renders the lock/undecryptable state itself
    return { ...m, displayText: payload.text };
  });

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => void qc.invalidateQueries({ queryKey }),
    onError: (err: unknown) => setSendError(err instanceof ApiError ? err.message : 'Message failed to send.'),
  });

  const send = useCallback(
    async (text: string) => {
      if (!chatCrypto || !threadId) return;
      setSendError(null);
      const envelope = await chatCrypto.encryptForChannel(threadId, { text });
      if (!envelope) {
        setSendError("Still setting up this conversation's encryption — try again in a moment.");
        return;
      }
      sendMutation.mutate(envelope);
    },
    [chatCrypto, threadId, sendMutation]
  );

  return {
    thread,
    isLoading,
    messages,
    keyState,
    canCompose: keyState === 'ready',
    send,
    sending: sendMutation.isPending,
    sendError,
    retryKey: ensureThreadKey,
  };
}
