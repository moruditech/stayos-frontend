'use client';

/**
 * Staff chat — internal team messaging.
 * TAD 11 §16: entirely separate from guest-facing communication.
 * Direct messages + channel list. Message pinning requires staff:manage.
 * Real-time updates via Socket.IO property namespace.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  RoleGate,
  useToast,
  useSocketEvent,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { chatKeys } from '@/lib/query-keys';

export default function StaffChatPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: chatKeys.channels(),
    queryFn: () => api.staffchat.getMyChannels(),
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: chatKeys.messages(activeChannelId ?? ''),
    queryFn: () => api.staffchat.getMessages(activeChannelId!),
    enabled: !!activeChannelId,
    refetchOnWindowFocus: false,
  });

  // Real-time new messages
  useSocketEvent('staffchat:message', (payload: { channelId: string }) => {
    void queryClient.invalidateQueries({ queryKey: chatKeys.messages(payload.channelId) });
    void queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      api.staffchat.sendMessage(activeChannelId!, text),
    onSuccess: () => {
      setMessageText('');
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(activeChannelId ?? '') });
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to send.', 'error'),
  });

  const pinMutation = useMutation({
    mutationFn: (messageId: string) => api.staffchat.pinMessage(messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(activeChannelId ?? '') });
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to pin.', 'error'),
  });

  function handleSend(e: React.FormEvent): void {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !activeChannelId) return;
    sendMutation.mutate(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <div data-page="staff-chat">
      <div data-chat-layout>
        {/* Channel sidebar */}
        <aside data-chat-sidebar>
          <div data-sidebar-header>
            <h2>Channels</h2>
          </div>
          {channelsLoading ? (
            <SkeletonLoader rows={4} />
          ) : (
            <div data-channel-list>
              {(channels ?? []).map((channel) => (
                <button
                  key={channel._id}
                  type="button"
                  data-channel-item
                  data-active={activeChannelId === channel._id || undefined}
                  onClick={() => setActiveChannelId(channel._id)}
                >
                  <span data-channel-name>
                    {channel.type === 'direct'
                      ? channel.participants
                          .filter((p) => p._id !== 'me')
                          .map((p) => `${p.firstName} ${p.lastName}`)
                          .join(', ')
                      : (channel.name ?? 'Channel')}
                  </span>
                  {channel.lastMessage && (
                    <span data-channel-preview>
                      {channel.lastMessage.text.slice(0, 40)}
                      {channel.lastMessage.text.length > 40 ? '…' : ''}
                    </span>
                  )}
                  {channel.unreadCount ? (
                    <span data-unread-badge>{channel.unreadCount}</span>
                  ) : null}
                </button>
              ))}
              {!channels?.length && (
                <p data-empty-note>No conversations yet.</p>
              )}
            </div>
          )}
        </aside>

        {/* Message area */}
        <main data-chat-main>
          {!activeChannelId ? (
            <div data-chat-empty>
              <p>Select a conversation to start chatting.</p>
            </div>
          ) : (
            <>
              <div data-chat-messages>
                {messagesLoading ? (
                  <SkeletonLoader rows={5} />
                ) : (
                  (messages ?? []).map((msg) => (
                    <div key={msg._id} data-chat-message data-pinned={msg.pinned || undefined}>
                      <div data-message-header>
                        <span data-message-sender>
                          {msg.senderId.firstName} {msg.senderId.lastName}
                        </span>
                        <span data-message-time>
                          {new Date(msg.createdAt).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.pinned && <span data-pin-indicator>Pinned</span>}
                        <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
                          {!msg.pinned && (
                            <button
                              type="button"
                              data-action-icon
                              aria-label="Pin message"
                              onClick={() => pinMutation.mutate(msg._id)}
                            >
                              Pin
                            </button>
                          )}
                        </RoleGate>
                      </div>
                      <p data-message-text>{msg.text}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} data-chat-compose>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={2}
                  data-chat-input
                />
                <button
                  type="submit"
                  data-btn-primary
                  disabled={!messageText.trim() || sendMutation.isPending}
                >
                  Send
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

