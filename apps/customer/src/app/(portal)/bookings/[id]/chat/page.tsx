'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { api } from '@stayos/api-client';
import { SkeletonLoader, Icons } from '@stayos/ui';
import { messageKeys } from '@/lib/query-keys';
import { useGuestThreadChat } from '@/lib/use-guest-thread-chat';

interface Props { params: { id: string } }

export default function BookingChatPage({ params }: Props): React.ReactElement {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const {
    thread, isLoading, messages, keyState, canCompose, send, sending, sendError, retryKey,
  } = useGuestThreadChat({
    queryKey: messageKeys.thread(params.id),
    fetchThread: () => api.customer.getBookingMessages(params.id),
    sendMessage: (envelope) => api.customer.sendBookingMessage(params.id, envelope),
  });

  const tenant = thread?.tenantId;
  const propertyName = (typeof tenant === 'object' && tenant ? tenant.name : null) ?? 'Property';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || sending || !canCompose) return;
    setDraft('');
    void send(text);
  };

  return (
    <div data-page style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--header-height, 64px))', padding: 0 }}>
      <div data-chat-header>
        <Link href={`/bookings/${params.id}`} aria-label="Back to booking" style={{ color: 'inherit', display: 'flex' }}>
          <Icons.ChevronLeft size={20} />
        </Link>
        <div>
          <div data-chat-header-name>{isLoading ? 'Loading…' : propertyName}</div>
          <div data-chat-header-sub>
            <Icons.Lock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
            End-to-end encrypted
          </div>
        </div>
      </div>

      {keyState === 'waiting' && (
        <div data-chat-key-banner>
          <Icons.KeyRound size={14} />
          <span>Setting up secure access to this conversation…</span>
          <button type="button" data-chat-key-retry onClick={() => void retryKey()}>Retry</button>
        </div>
      )}
      {keyState === 'error' && (
        <div data-chat-key-banner data-error>
          <Icons.AlertCircle size={14} />
          <span>Something went wrong setting up encryption.</span>
          <button type="button" data-chat-key-retry onClick={() => void retryKey()}>Retry</button>
        </div>
      )}

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
                {m.encrypted && m.displayText === '' ? (
                  <span data-chat-undecryptable>
                    <Icons.Lock size={11} /> Unable to decrypt this message
                  </span>
                ) : (
                  m.displayText
                )}
              </div>
              <div data-chat-time>
                {new Date(m.sentAt).toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>

      {sendError && <div data-chat-send-error>{sendError}</div>}

      <div data-chat-composer>
        <textarea
          rows={1}
          value={draft}
          placeholder={canCompose ? 'Message the property…' : 'Setting up encryption…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          disabled={!canCompose}
          data-chat-input
        />
        <button
          type="button"
          data-chat-send
          aria-label="Send message"
          disabled={!draft.trim() || sending || !canCompose}
          onClick={handleSend}
        >
          <Icons.Send size={18} />
        </button>
      </div>
    </div>
  );
}
