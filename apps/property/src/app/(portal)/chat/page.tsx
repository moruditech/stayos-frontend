'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@stayos/api-client';
import type { ChatChannel, ChatMessage } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  RoleGate,
  Modal,
  useToast,
  useSocketEvent,
  useEmit,
  Icons,
} from '@stayos/ui';
import { PERMISSIONS, SOCKET_EVENTS } from '@stayos/constants';
import { useSession } from '@stayos/auth';
import { getChatCrypto } from '@stayos/crypto';
import type { MessagePayload } from '@stayos/crypto';
import { chatKeys } from '@/lib/query-keys';
import { enablePushNotifications } from '@/lib/push-notifications';

type KeyState = 'idle' | 'checking' | 'ready' | 'waiting' | 'error';

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** A direct channel's display name is viewer-relative — "the other person" — so it's computed here, not trusted from the server. */
function channelLabel(channel: ChatChannel, myUserId: string): string {
  if (channel.type === 'direct') {
    const other = channel.participants.find((p) => p._id !== myUserId);
    return other ? `${other.firstName} ${other.lastName}` : channel.name;
  }
  return channel.name;
}

export default function StaffChatPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const emit = useEmit();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [keyState, setKeyState] = useState<Record<string, KeyState>>({});
  const [decrypted, setDecrypted] = useState<Record<string, MessagePayload | null>>({});
  const [previewText, setPreviewText] = useState<Record<string, string | null>>({});

  const chatCrypto = useMemo(
    () => (session ? getChatCrypto(session.tenantId ?? '', session.userId) : null),
    [session]
  );

  // ── Identity bootstrap: one ECDH key pair per browser, generated once and
  // reused forever after. Only a brand-new one needs publishing. ──────────
  useEffect(() => {
    if (!chatCrypto) return;
    let cancelled = false;
    setIdentityReady(false);
    (async () => {
      const { publicKeyJwk, isNew } = await chatCrypto.ensureIdentity();
      if (isNew) {
        await api.staffchat.setMyPublicKey(publicKeyJwk).catch(() => {
          // Non-fatal: this device just keeps looking like "no key on file"
          // to everyone else until a future page load succeeds in
          // publishing it — nothing about chat itself breaks in the
          // meantime, it just can't be reached by a brand-new channel yet.
        });
      }
      if (!cancelled) setIdentityReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatCrypto]);

  // ── Channels list ─────────────────────────────────────────────────────────
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: chatKeys.channels(),
    queryFn: () => api.staffchat.getMyChannels(),
  });

  const activeChannel = useMemo(
    () => channels?.find((c) => c._id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  // ── Messages for the open channel ────────────────────────────────────────
  const { data: messagesResult, isLoading: messagesLoading } = useQuery({
    queryKey: chatKeys.messages(activeChannelId ?? ''),
    queryFn: () => api.staffchat.getMessages(activeChannelId as string),
    enabled: !!activeChannelId,
  });
  // Server returns newest-first (for pagination); display oldest-to-newest.
  const messages = useMemo(
    () => (messagesResult?.data ?? []).slice().reverse(),
    [messagesResult]
  );

  // ── Establish (or request) this channel's content key ───────────────────
  const ensureChannelKey = useCallback(
    async (channelId: string) => {
      if (!chatCrypto) return;
      if (chatCrypto.hasChannelKey(channelId)) {
        setKeyState((s) => ({ ...s, [channelId]: 'ready' }));
        return;
      }

      setKeyState((s) => ({ ...s, [channelId]: 'checking' }));
      try {
        const wrap = await api.staffchat.getMyChannelKey(channelId);
        if (wrap) {
          await chatCrypto.unwrapAndCache(channelId, wrap);
          setKeyState((s) => ({ ...s, [channelId]: 'ready' }));
          return;
        }

        const { members, channelHasKey } = await api.staffchat.getChannelMembers(channelId);

        if (!channelHasKey) {
          const { key, wraps } = await chatCrypto.generateAndWrapNewKey(
            members.map((m) => ({ staffId: m.staffId, publicKey: m.publicKey }))
          );
          try {
            await api.staffchat.publishChannelKeys(channelId, wraps, true);
            chatCrypto.cacheChannelKey(channelId, key);
            setKeyState((s) => ({ ...s, [channelId]: 'ready' }));
            return;
          } catch (err) {
            if (!(err instanceof ApiError) || err.code !== 'ALREADY_BOOTSTRAPPED') throw err;
            // Someone else's client won the race to establish this
            // channel's key a moment before we did — fall through and ask
            // them for it, same as any other new member would.
          }
        }

        setKeyState((s) => ({ ...s, [channelId]: 'waiting' }));
        emit(SOCKET_EVENTS.STAFFCHAT_KEY_REQUEST, { channelId });
      } catch {
        setKeyState((s) => ({ ...s, [channelId]: 'error' }));
      }
    },
    [chatCrypto, emit]
  );

  useEffect(() => {
    if (!activeChannelId || !identityReady) return;
    void ensureChannelKey(activeChannelId);
  }, [activeChannelId, identityReady, ensureChannelKey]);

  // ── Service other people's key requests for channels I already hold ─────
  const serviceKeyRequest = useCallback(
    async (channelId: string, requesterId: string) => {
      if (!chatCrypto || !chatCrypto.hasChannelKey(channelId)) return;
      try {
        const { members } = await api.staffchat.getChannelMembers(channelId);
        const requester = members.find((m) => m.staffId === requesterId);
        if (!requester?.publicKey) return;
        const wrap = await chatCrypto.wrapCachedKeyFor(channelId, requesterId, requester.publicKey);
        if (wrap) await api.staffchat.publishChannelKeys(channelId, [wrap]);
      } catch {
        // Best-effort — the requester just stays in "waiting" and their
        // client will pick it up next time someone who holds the key is
        // online, or they can retry manually.
      }
    },
    [chatCrypto]
  );

  // ── Real-time wiring ──────────────────────────────────────────────────────
  // NOTE on convention: useSocketEvent's contract elsewhere in this app is
  // "handler only invalidates a query key, never holds payload data in
  // state" — kept here for STAFFCHAT_NEW_MESSAGE/HANDOVER_POSTED below. The
  // three E2EE handlers (key_request/key_granted/members_changed) are a
  // deliberate, narrow exception: channel key material lives in
  // @stayos/crypto's in-memory cache BY DESIGN, outside react-query's
  // cache, specifically so it's never persisted or serialized anywhere —
  // so "refetch via the query layer" isn't an available option for it, and
  // reacting to these events necessarily means calling into that cache
  // directly (via ensureChannelKey/serviceKeyRequest) rather than just
  // invalidating a key. No message content ever touches these handlers.
  useSocketEvent<{ channelId: string; requesterId: string }>(
    SOCKET_EVENTS.STAFFCHAT_KEY_REQUEST,
    useCallback((payload) => void serviceKeyRequest(payload.channelId, payload.requesterId), [serviceKeyRequest])
  );

  useSocketEvent<{ channelId: string }>(
    SOCKET_EVENTS.STAFFCHAT_KEY_GRANTED,
    useCallback((payload) => void ensureChannelKey(payload.channelId), [ensureChannelKey])
  );

  useSocketEvent<{ channelId: string; reason: string }>(
    SOCKET_EVENTS.STAFFCHAT_MEMBERS_CHANGED,
    useCallback(
      (payload) => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
        chatCrypto?.clearChannelKey(payload.channelId);
        setKeyState((s) => ({ ...s, [payload.channelId]: 'idle' }));
        if (payload.channelId === activeChannelId) void ensureChannelKey(payload.channelId);
      },
      [queryClient, chatCrypto, activeChannelId, ensureChannelKey]
    )
  );

  useSocketEvent<{ channelId: string }>(
    SOCKET_EVENTS.STAFFCHAT_NEW_MESSAGE,
    useCallback(
      (payload) => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(payload.channelId) });
        void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
      },
      [queryClient]
    )
  );

  useSocketEvent<{ channelId: string }>(
    SOCKET_EVENTS.STAFFCHAT_HANDOVER_POSTED,
    useCallback(
      (payload) => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(payload.channelId) });
        void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
      },
      [queryClient]
    )
  );

  // ── Decrypt messages for the open channel as they arrive ─────────────────
  useEffect(() => {
    if (!chatCrypto || !activeChannelId) return;
    const pending = messages.filter((m) => !(m._id in decrypted));
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, MessagePayload | null> = {};
      for (const msg of pending) {
        updates[msg._id] = await chatCrypto.decryptForChannel(activeChannelId, {
          ciphertext: msg.ciphertext,
          iv: msg.iv,
        });
      }
      if (!cancelled) setDecrypted((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
    // `decrypted` intentionally excluded: this effect's own setDecrypted
    // call is the only thing that would change it, and re-running because
    // of that would just find nothing left to do.
  }, [messages, chatCrypto, activeChannelId, keyState[activeChannelId ?? '']]);

  // ── Opportunistic sidebar previews for channels whose key we already hold ─
  useEffect(() => {
    if (!chatCrypto || !channels) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string | null> = {};
      for (const ch of channels) {
        if (!ch.lastMessage || ch.lastMessage._id in previewText) continue;
        if (!chatCrypto.hasChannelKey(ch._id)) continue; // don't force a bootstrap just to render a preview
        const payload = await chatCrypto.decryptForChannel(ch._id, {
          ciphertext: ch.lastMessage.ciphertext,
          iv: ch.lastMessage.iv,
        });
        updates[ch.lastMessage._id] = payload?.text ?? null;
      }
      if (!cancelled && Object.keys(updates).length) setPreviewText((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [channels, chatCrypto, keyState]);

  // ── Mark visible unread messages as read ─────────────────────────────────
  useEffect(() => {
    if (!activeChannelId || !session || !messages.length) return;
    const toMark = messages.filter(
      (m) => m.senderId._id !== session.userId && !m.readBy.includes(session.userId)
    );
    if (!toMark.length) return;
    void Promise.all(toMark.map((m) => api.staffchat.markRead(m._id))).then(() => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
    });
  }, [messages, activeChannelId, session, queryClient]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (input: { ciphertext: string; iv: string }) =>
      api.staffchat.sendMessage(activeChannelId as string, { ciphertext: input.ciphertext, iv: input.iv }),
    onSuccess: () => {
      setMessageText('');
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(activeChannelId ?? '') });
      void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
    },
    onError: (err: unknown) => toast(err instanceof ApiError ? err.message : 'Failed to send message.', 'error'),
  });

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = messageText.trim();
      if (!text || !activeChannelId || !chatCrypto) return;
      const envelope = await chatCrypto.encryptForChannel(activeChannelId, { text });
      if (!envelope) {
        toast("Still setting up this conversation's encryption — try again in a moment.", 'error');
        return;
      }
      sendMutation.mutate(envelope);
    },
    [messageText, activeChannelId, chatCrypto, sendMutation, toast]
  );

  const pinMutation = useMutation({
    mutationFn: (input: { messageId: string; isPinned: boolean }) =>
      api.staffchat.pinMessage(input.messageId, input.isPinned),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chatKeys.messages(activeChannelId ?? '') }),
    onError: (err: unknown) => toast(err instanceof ApiError ? err.message : 'Failed to update message.', 'error'),
  });

  const handleCreated = useCallback(
    (channel: ChatChannel) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
      setActiveChannelId(channel._id);
      setShowNewChat(false);
    },
    [queryClient]
  );

  const handleEnableNotifications = useCallback(async () => {
    const result = await enablePushNotifications();
    if (result === 'granted') toast('Push notifications enabled for this browser.', 'success');
    else if (result === 'denied') toast('Notification permission was not granted.', 'info');
    else if (result === 'unconfigured') toast('Push notifications are not set up for this property yet.', 'info');
    else if (result === 'unsupported') toast("This browser doesn't support push notifications.", 'info');
    else toast('Could not enable push notifications.', 'error');
  }, [toast]);

  const activeKeyState = activeChannelId ? keyState[activeChannelId] ?? 'idle' : 'idle';
  const canCompose = activeKeyState === 'ready';

  if (!session) return <SkeletonLoader rows={6} />;

  return (
    <div data-chat-layout>
      <aside data-chat-sidebar>
        <div data-sidebar-header>
          <h2>Channels</h2>
          <div data-sidebar-header-actions>
            <button
              type="button"
              data-btn-icon
              aria-label="Enable push notifications"
              title="Enable push notifications"
              onClick={() => void handleEnableNotifications()}
            >
              <Icons.Bell size={16} aria-hidden />
            </button>
            <button
              type="button"
              data-btn-icon
              aria-label="New conversation"
              disabled={!identityReady}
              onClick={() => setShowNewChat(true)}
            >
              <Icons.Plus size={16} aria-hidden />
            </button>
          </div>
        </div>

        {channelsLoading ? (
          <SkeletonLoader rows={5} />
        ) : !channels?.length ? (
          <p data-empty-note>No conversations yet.</p>
        ) : (
          <ul data-channel-list>
            {channels.map((channel) => (
              <li key={channel._id}>
                <button
                  type="button"
                  data-channel-item
                  data-active={channel._id === activeChannelId || undefined}
                  onClick={() => setActiveChannelId(channel._id)}
                >
                  <span data-channel-name>{channelLabel(channel, session.userId)}</span>
                  {channel.unreadCount > 0 && <span data-unread-badge>{channel.unreadCount}</span>}
                  {channel.lastMessage && (
                    <span data-channel-preview>
                      {(() => {
                        const text = previewText[channel.lastMessage._id];
                        if (text) return truncate(text, 40);
                        return (
                          <>
                            <Icons.Lock size={10} aria-hidden /> Encrypted message
                          </>
                        );
                      })()}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section data-chat-main>
        {!activeChannel ? (
          <div data-chat-empty>
            <EmptyState title="Select a conversation to start chatting." />
          </div>
        ) : (
          <>
            <header data-chat-header>
              <span data-chat-header-name>{channelLabel(activeChannel, session.userId)}</span>
              <span data-chat-header-lock title="End-to-end encrypted">
                <Icons.Lock size={13} aria-hidden /> Encrypted
              </span>
            </header>

            {activeKeyState === 'waiting' && (
              <div data-chat-key-banner>
                <Icons.KeyRound size={14} aria-hidden />
                <span>Waiting for a teammate to grant access to this conversation…</span>
                <button type="button" data-btn-secondary onClick={() => void ensureChannelKey(activeChannel._id)}>
                  Retry
                </button>
              </div>
            )}
            {activeKeyState === 'error' && (
              <div data-chat-key-banner data-error>
                <Icons.AlertCircle size={14} aria-hidden />
                <span>Something went wrong setting up encryption for this conversation.</span>
                <button type="button" data-btn-secondary onClick={() => void ensureChannelKey(activeChannel._id)}>
                  Retry
                </button>
              </div>
            )}

            <div data-chat-messages>
              {messagesLoading ? (
                <SkeletonLoader rows={4} />
              ) : (
                messages.map((msg) => (
                  <div key={msg._id} data-chat-message data-own={msg.senderId._id === session.userId || undefined} data-pinned={msg.isPinned || undefined}>
                    <div data-message-header>
                      <span data-message-sender>
                        {msg.senderId.firstName} {msg.senderId.lastName}
                      </span>
                      <span data-message-time>{formatTime(msg.createdAt)}</span>
                      {msg.isPinned && <span data-pin-indicator>Pinned</span>}
                    </div>
                    <p data-message-text>{renderMessageBody(msg, decrypted[msg._id])}</p>
                    <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
                      <button
                        type="button"
                        data-action-icon
                        onClick={() => pinMutation.mutate({ messageId: msg._id, isPinned: !msg.isPinned })}
                      >
                        {msg.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    </RoleGate>
                  </div>
                ))
              )}
            </div>

            <form data-chat-compose onSubmit={(e) => void handleSend(e)}>
              <input
                type="text"
                data-chat-input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={canCompose ? 'Type a message…' : 'Setting up encryption…'}
                disabled={!canCompose || sendMutation.isPending}
              />
              <button type="submit" data-btn-primary disabled={!canCompose || !messageText.trim() || sendMutation.isPending}>
                {sendMutation.isPending ? <Icons.Loader2 size={14} className="spin" aria-hidden /> : <Icons.Send size={14} aria-hidden />}
              </button>
            </form>
          </>
        )}
      </section>

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreated={handleCreated}
        myUserId={session.userId}
      />
    </div>
  );
}

function renderMessageBody(msg: ChatMessage, payload: MessagePayload | null | undefined): React.ReactNode {
  if (payload === undefined) return <span data-message-pending>Decrypting…</span>;
  if (payload === null) {
    return (
      <span data-message-undecryptable>
        <Icons.Lock size={12} aria-hidden /> Unable to decrypt this message
      </span>
    );
  }
  return payload.text;
}

// ── New conversation modal ───────────────────────────────────────────────────

function NewChatModal({
  open,
  onClose,
  onCreated,
  myUserId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (channel: ChatChannel) => void;
  myUserId: string;
}): React.ReactElement {
  const { toast } = useToast();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setMode('direct');
      setGroupName('');
      setSelected(new Set());
    }
  }, [open]);

  const { data: directory, isLoading } = useQuery({
    queryKey: chatKeys.directory(),
    queryFn: () => api.staffchat.getDirectory(),
    enabled: open,
  });

  const colleagues = useMemo(() => (directory ?? []).filter((d) => d._id !== myUserId), [directory, myUserId]);

  const dmMutation = useMutation({
    mutationFn: (targetStaffId: string) => api.staffchat.getOrCreateDM(targetStaffId),
    onSuccess: onCreated,
    onError: (err: unknown) =>
      toast(err instanceof ApiError ? err.message : 'Could not start that conversation.', 'error'),
  });

  const groupMutation = useMutation({
    mutationFn: () => api.staffchat.createGroup({ name: groupName.trim(), memberIds: Array.from(selected) }),
    onSuccess: onCreated,
    onError: (err: unknown) => toast(err instanceof ApiError ? err.message : 'Could not create that channel.', 'error'),
  });

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <Modal open={open} onClose={onClose} title="New conversation">
      <div data-chat-mode-tabs>
        <button type="button" data-active={mode === 'direct' || undefined} onClick={() => setMode('direct')}>
          Direct message
        </button>
        <button type="button" data-active={mode === 'group' || undefined} onClick={() => setMode('group')}>
          <Icons.Users size={14} aria-hidden /> New channel
        </button>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={4} />
      ) : mode === 'direct' ? (
        <div data-chat-directory-list>
          {colleagues.map((person) => (
            <button
              key={person._id}
              type="button"
              data-directory-item
              disabled={dmMutation.isPending}
              onClick={() => dmMutation.mutate(person._id)}
            >
              <span data-directory-name>
                {person.firstName} {person.lastName}
              </span>
              <span data-directory-role>{person.role.replace(/_/g, ' ')}</span>
            </button>
          ))}
          {!colleagues.length && <p data-empty-note>No other staff members yet.</p>}
        </div>
      ) : (
        <div data-chat-group-form>
          <label data-form-label htmlFor="new-channel-name">
            Channel name
          </label>
          <input
            id="new-channel-name"
            type="text"
            data-chat-input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Housekeeping weekend crew"
          />

          <p data-form-label>Members</p>
          <div data-chat-directory-list>
            {colleagues.map((person) => (
              <label key={person._id} data-directory-item data-checkbox-label>
                <input type="checkbox" checked={selected.has(person._id)} onChange={() => toggle(person._id)} />
                <span data-directory-name>
                  {person.firstName} {person.lastName}
                </span>
                <span data-directory-role>{person.role.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            data-btn-primary
            disabled={!groupName.trim() || !selected.size || groupMutation.isPending}
            onClick={() => groupMutation.mutate()}
          >
            {groupMutation.isPending ? (
              <Icons.Loader2 size={14} className="spin" aria-hidden />
            ) : (
              <Icons.Plus size={14} aria-hidden />
            )}
            Create channel
          </button>
        </div>
      )}
    </Modal>
  );
}
