'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@stayos/api-client';
import type { GuestThreadDTO, GuestThreadWrappedKeyDTO } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, useSocketEvent, Icons } from '@stayos/ui';
import { PERMISSIONS, SOCKET_EVENTS } from '@stayos/constants';
import { useSession } from '@stayos/auth';
import { getChatCrypto } from '@stayos/crypto';
import type { MessagePayload } from '@stayos/crypto';
import { guestMessagingKeys } from '@/lib/query-keys';

type KeyState = 'idle' | 'checking' | 'ready' | 'waiting' | 'error';
type ReplyChannel = 'in_app' | 'whatsapp' | 'sms';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function customerLabel(thread: GuestThreadDTO): string {
  const c = thread.customerId;
  if (c && typeof c === 'object' && c.firstName) return `${c.firstName} ${c.lastName ?? ''}`.trim();
  return 'Guest';
}

export default function GuestMessagesPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'assigned' | 'resolved' | undefined>(undefined);
  const [replyChannel, setReplyChannel] = useState<ReplyChannel>('in_app');
  const [replyText, setReplyText] = useState('');
  const [identityReady, setIdentityReady] = useState(false);
  const [keyState, setKeyState] = useState<Record<string, KeyState>>({});
  const [decrypted, setDecrypted] = useState<Record<string, MessagePayload | null>>({});

  const chatCrypto = useMemo(
    () => (session ? getChatCrypto(session.tenantId ?? '', session.userId) : null),
    [session]
  );

  // Identity is shared with staff chat (same person, one key) — just needs
  // to be loaded here too in case this staff member has never opened
  // /chat. Publishing a fresh key reuses staffchat's existing endpoint
  // rather than duplicating "set my public key" in this module.
  useEffect(() => {
    if (!chatCrypto) return;
    let cancelled = false;
    (async () => {
      const { publicKeyJwk, isNew } = await chatCrypto.ensureIdentity();
      if (isNew) {
        await api.staffchat.setMyPublicKey(publicKeyJwk).catch(() => {});
      }
      if (!cancelled) setIdentityReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatCrypto]);

  const { data: threadsResult, isLoading: threadsLoading } = useQuery({
    queryKey: guestMessagingKeys.threads({ status: statusFilter }),
    queryFn: () => api.messaging.listThreads({ status: statusFilter }),
  });
  const threads = threadsResult?.data ?? [];

  const { data: activeThread, isLoading: threadLoading } = useQuery({
    queryKey: guestMessagingKeys.thread(activeThreadId ?? ''),
    queryFn: () => api.messaging.getThread(activeThreadId as string),
    enabled: !!activeThreadId,
  });

  const messages = useMemo(
    () => (activeThread?.messages ?? []).slice().sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
    [activeThread]
  );

  // ── E2EE: establish (or request) the active thread's key ─────────────────
  const ensureThreadKey = useCallback(
    async (threadId: string) => {
      if (!chatCrypto) return;
      if (chatCrypto.hasChannelKey(threadId)) {
        setKeyState((s) => ({ ...s, [threadId]: 'ready' }));
        return;
      }
      setKeyState((s) => ({ ...s, [threadId]: 'checking' }));
      try {
        const wrap = await api.messaging.getMyThreadKey(threadId);
        if (wrap) {
          await chatCrypto.unwrapAndCache(threadId, wrap);
          setKeyState((s) => ({ ...s, [threadId]: 'ready' }));
          return;
        }

        const { members, channelHasKey } = await api.messaging.getThreadMembers(threadId);

        if (!channelHasKey) {
          const { key, wraps } = await chatCrypto.generateAndWrapNewKey(
            members.map((m) => ({ memberId: m.recipientId, publicKey: m.publicKey }))
          );
          if (wraps.length) {
            const wrapsWithModel: GuestThreadWrappedKeyDTO[] = wraps.map((w) => ({
              recipientId: w.memberId,
              recipientModel: members.find((m) => m.recipientId === w.memberId)?.recipientModel ?? 'Customer',
              wrappedKey: w.wrappedKey,
              iv: w.iv,
              ephemeralPublicKey: w.ephemeralPublicKey,
            }));
            try {
              await api.messaging.publishThreadKeys(threadId, wrapsWithModel, true);
              chatCrypto.cacheChannelKey(threadId, key);
              setKeyState((s) => ({ ...s, [threadId]: 'ready' }));
              return;
            } catch (err) {
              if (!(err instanceof ApiError) || err.code !== 'ALREADY_BOOTSTRAPPED') throw err;
            }
          }
        }

        setKeyState((s) => ({ ...s, [threadId]: 'waiting' }));
        await api.messaging.requestThreadKey(threadId).catch(() => {});
      } catch {
        setKeyState((s) => ({ ...s, [threadId]: 'error' }));
      }
    },
    [chatCrypto]
  );

  useEffect(() => {
    if (!activeThreadId || !identityReady) return;
    void ensureThreadKey(activeThreadId);
  }, [activeThreadId, identityReady, ensureThreadKey]);

  useEffect(() => {
    if (!activeThreadId || keyState[activeThreadId] !== 'waiting') return;
    const interval = setInterval(() => void ensureThreadKey(activeThreadId), 20_000);
    return () => clearInterval(interval);
  }, [activeThreadId, keyState, ensureThreadKey]);

  // Servicing OTHER staff/customers' key requests (live broadcast + durable
  // catch-up) is handled by GuestMessagingKeyResolver, mounted once in the
  // portal layout — so it runs regardless of which page a capable teammate
  // has open, not just while they happen to have this inbox open. Only the
  // "did someone grant ME access" listener stays here, since that's
  // specific to whatever thread THIS page currently has open.
  useSocketEvent<{ threadId: string }>(
    SOCKET_EVENTS.MESSAGING_KEY_GRANTED,
    useCallback((payload) => void ensureThreadKey(payload.threadId), [ensureThreadKey])
  );

  useSocketEvent<{ threadId: string }>(
    SOCKET_EVENTS.MESSAGING_NEW_MESSAGE,
    useCallback(
      (payload) => {
        void queryClient.invalidateQueries({ queryKey: guestMessagingKeys.thread(payload.threadId) });
        void queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
      },
      [queryClient]
    )
  );

  // ── Decrypt in_app messages for the open thread ──────────────────────────
  useEffect(() => {
    if (!chatCrypto || !activeThreadId) return;
    const pending = messages.filter((m) => m.encrypted && !(m._id in decrypted));
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, MessagePayload | null> = {};
      for (const msg of pending) {
        updates[msg._id] = await chatCrypto.decryptForChannel(activeThreadId, {
          ciphertext: msg.ciphertext ?? '',
          iv: msg.iv ?? '',
        });
      }
      if (!cancelled) setDecrypted((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, chatCrypto, activeThreadId, keyState[activeThreadId ?? '']]);

  // Mark read when opening a thread with unread messages
  useEffect(() => {
    if (!activeThreadId || !activeThread || !activeThread.unreadCount) return;
    void api.messaging.markRead(activeThreadId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
    });
  }, [activeThreadId, activeThread, queryClient]);

  const activeKeyState = activeThreadId ? keyState[activeThreadId] ?? 'idle' : 'idle';

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!activeThreadId) throw new Error('No conversation selected');
      if (replyChannel === 'in_app') {
        if (!chatCrypto) throw new Error('Encryption not ready');
        const envelope = await chatCrypto.encryptForChannel(activeThreadId, { text: replyText.trim() });
        if (!envelope) throw new Error("Still setting up this conversation's encryption — try again in a moment.");
        return api.messaging.replyInApp(activeThreadId, envelope);
      }
      if (replyChannel === 'whatsapp') return api.messaging.replyWhatsapp(activeThreadId, replyText.trim());
      return api.messaging.replySms(activeThreadId, replyText.trim());
    },
    onSuccess: () => {
      setReplyText('');
      void queryClient.invalidateQueries({ queryKey: guestMessagingKeys.thread(activeThreadId ?? '') });
      void queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
    },
    onError: (err: unknown) => toast(err instanceof Error ? err.message : 'Failed to send reply.', 'error'),
  });

  const canAssign = !!session?.permissions.includes(PERMISSIONS.MESSAGING_ASSIGN);

  const { data: assignableStaff } = useQuery({
    queryKey: ['messaging', 'assignable-staff'],
    queryFn: () => api.messaging.getAssignableStaff(),
    enabled: canAssign,
  });

  const assignMutation = useMutation({
    mutationFn: (staffId: string) => api.messaging.assignThread(activeThreadId as string, staffId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: guestMessagingKeys.thread(activeThreadId ?? '') });
      void queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
    },
    onError: (err: unknown) => toast(err instanceof ApiError ? err.message : 'Failed to assign conversation.', 'error'),
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.messaging.resolveThread(activeThreadId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: guestMessagingKeys.thread(activeThreadId ?? '') });
      void queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
    },
  });

  const canComposeInApp = replyChannel !== 'in_app' || activeKeyState === 'ready';

  if (!session) return <SkeletonLoader rows={6} />;

  return (
    <div data-chat-layout>
      <aside data-chat-sidebar>
        <div data-sidebar-header>
          <h2>Guest Messages</h2>
        </div>
        <div data-gm-filter-tabs>
          {(['open', 'assigned', 'resolved'] as const).map((s) => (
            <button
              key={s}
              type="button"
              data-active={statusFilter === s || undefined}
              onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {threadsLoading ? (
          <SkeletonLoader rows={5} />
        ) : !threads.length ? (
          <p data-empty-note>No conversations yet.</p>
        ) : (
          <ul data-channel-list>
            {threads.map((thread) => (
              <li key={thread._id}>
                <button
                  type="button"
                  data-channel-item
                  data-active={thread._id === activeThreadId || undefined}
                  onClick={() => setActiveThreadId(thread._id)}
                >
                  <span data-channel-name>{customerLabel(thread)}</span>
                  {thread.unreadCount > 0 && <span data-unread-badge>{thread.unreadCount}</span>}
                  <span data-gm-status data-status={thread.status}>{thread.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section data-chat-main>
        {!activeThreadId || !activeThread ? (
          <div data-chat-empty>
            {threadLoading ? <SkeletonLoader rows={4} /> : <EmptyState title="Select a conversation." />}
          </div>
        ) : (
          <>
            <header data-chat-header>
              <span data-chat-header-name>{customerLabel(activeThread)}</span>
              <div data-gm-header-actions>
                {canAssign && (
                  <select
                    data-gm-assign-select
                    value={activeThread.assignedTo ? activeThread.assignedTo._id : ''}
                    onChange={(e) => {
                      if (e.target.value) assignMutation.mutate(e.target.value);
                    }}
                    disabled={assignMutation.isPending}
                  >
                    <option value="" disabled>
                      Assign to…
                    </option>
                    {(assignableStaff ?? []).map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" data-btn-secondary onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
                  Resolve
                </button>
              </div>
            </header>

            {activeKeyState === 'waiting' && (
              <div data-chat-key-banner>
                <Icons.KeyRound size={14} aria-hidden />
                <span>Waiting for the guest (or a teammate) to grant access to this conversation…</span>
                <button type="button" data-btn-secondary onClick={() => void ensureThreadKey(activeThreadId)}>Retry</button>
              </div>
            )}
            {activeKeyState === 'error' && (
              <div data-chat-key-banner data-error>
                <Icons.AlertCircle size={14} aria-hidden />
                <span>Something went wrong setting up encryption.</span>
                <button type="button" data-btn-secondary onClick={() => void ensureThreadKey(activeThreadId)}>Retry</button>
              </div>
            )}

            <div data-chat-messages>
              {messages.map((msg) => (
                <div key={msg._id} data-chat-message data-own={msg.direction === 'outbound' || undefined}>
                  <div data-message-header>
                    <span data-message-sender>
                      {msg.direction === 'outbound' ? 'You' : customerLabel(activeThread)}
                    </span>
                    <span data-message-time>{formatTime(msg.sentAt)}</span>
                    <span data-gm-channel-tag>{msg.channel}</span>
                  </div>
                  <p data-message-text>
                    {msg.encrypted ? (
                      decrypted[msg._id] === undefined ? (
                        <span data-message-pending>Decrypting…</span>
                      ) : decrypted[msg._id] === null ? (
                        <span data-message-undecryptable>
                          <Icons.Lock size={12} aria-hidden /> Unable to decrypt this message
                        </span>
                      ) : (
                        decrypted[msg._id]?.text
                      )
                    ) : (
                      msg.body
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div data-gm-reply-tabs>
              {(['in_app', 'whatsapp', 'sms'] as const).map((c) => (
                <button key={c} type="button" data-active={replyChannel === c || undefined} onClick={() => setReplyChannel(c)}>
                  {c === 'in_app' ? 'In-app (encrypted)' : c === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                </button>
              ))}
            </div>

            <form
              data-chat-compose
              onSubmit={(e) => {
                e.preventDefault();
                if (replyText.trim() && !replyMutation.isPending) replyMutation.mutate();
              }}
            >
              <input
                type="text"
                data-chat-input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={canComposeInApp ? 'Type a reply…' : 'Setting up encryption…'}
                disabled={!canComposeInApp || replyMutation.isPending}
              />
              <button type="submit" data-btn-primary disabled={!canComposeInApp || !replyText.trim() || replyMutation.isPending}>
                {replyMutation.isPending ? <Icons.Loader2 size={14} className="spin" aria-hidden /> : <Icons.Send size={14} aria-hidden />}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
