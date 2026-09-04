'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, useSocketEvent, Icons } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { messageKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

interface ThreadMessage {
  _id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  body: string;
  sentAt: string;
}

export default function BookingChatPage({ params }: Props): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: thread, isLoading } = useQuery({
    queryKey: messageKeys.thread(params.id),
    queryFn:  () => api.customer.getBookingMessages(params.id),
    enabled:  !!session,
    // The property may reply while this screen is open — a light poll is a
    // reasonable fallback alongside the socket push below, in case a
    // connection drops without the socket noticing right away.
    refetchInterval: 15000,
  });

  // Real-time: per useSocketEvent's contract, the handler's only job is
  // invalidating the query — never holding the payload in local state.
  const onNewMessage = useCallback(() => {
    qc.invalidateQueries({ queryKey: messageKeys.thread(params.id) });
  }, [qc, params.id]);
  useSocketEvent(SOCKET_EVENTS.MESSAGING_NEW_MESSAGE, onNewMessage);

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.customer.sendBookingMessage(params.id, body),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: messageKeys.thread(params.id) });
    },
    onError: (err: ApiError) => toast(err.message ?? 'Message failed to send.', 'error'),
  });

  const t = thread as Record<string, unknown> | undefined;
  const tenant = (typeof t?.['tenantId'] === 'object' && t?.['tenantId'] !== null
    ? t['tenantId'] : {}) as Record<string, unknown>;
  const propertyName = (tenant['name'] as string) ?? 'Property';
  const messages = ((t?.['messages'] as ThreadMessage[]) ?? [])
    .slice()
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  };

  return (
    <div data-page style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--header-height, 64px))', padding: 0 }}>
      <div data-chat-header>
        <Link href={`/bookings/${params.id}`} aria-label="Back to booking" style={{ color: 'inherit', display: 'flex' }}>
          <Icons.ChevronLeft size={20} />
        </Link>
        <div>
          <div data-chat-header-name>{isLoading ? 'Loading…' : propertyName}</div>
          <div data-chat-header-sub>Property support</div>
        </div>
      </div>

      <div data-chat-messages ref={scrollRef}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}><SkeletonLoader rows={3} /></div>
        ) : messages.length === 0 ? (
          <div data-chat-empty>
            <Icons.MessageCircle size={28} style={{ color: 'var(--color-text-muted)' }} />
            <p>Send a message and the property will get back to you here.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m._id} data-chat-row data-mine={m.direction === 'inbound' ? '' : undefined}>
              <div data-chat-bubble data-mine={m.direction === 'inbound' ? '' : undefined}>
                {m.body}
              </div>
              <div data-chat-time>
                {new Date(m.sentAt).toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>

      <div data-chat-composer>
        <textarea
          rows={1}
          value={draft}
          placeholder="Message the property…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          data-chat-input
        />
        <button
          type="button"
          data-chat-send
          aria-label="Send message"
          disabled={!draft.trim() || sendMutation.isPending}
          onClick={handleSend}
        >
          <Icons.Send size={18} />
        </button>
      </div>
    </div>
  );
}
