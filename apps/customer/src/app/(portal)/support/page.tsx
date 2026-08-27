'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, InlineError, Icons } from '@stayos/ui';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const PUBLIC_SITE_URL = process.env['NEXT_PUBLIC_PUBLIC_SITE_URL'] ?? 'https://stayos.co.za';

const SUPPORT_KEYS = {
  list:     () => ['support','tickets','mine'] as const,
  detail:   (id: string) => ['support','ticket', id] as const,
  messages: (id: string) => ['support','messages', id] as const,
};

const newTicketSchema = z.object({
  subject:     z.string().min(5, 'Subject is required'),
  description: z.string().min(10, 'Please describe your issue'),
  category:    z.enum(['billing', 'booking', 'technical', 'complaint', 'account', 'other']),
});
type NewTicketInput = z.infer<typeof newTicketSchema>;

export default function SupportPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();

  const [view, setView]                 = useState<'list'|'new'|{id:string}>('list');
  const [replyText, setReplyText]       = useState('');

  const { data: tickets, isLoading } = useQuery({
    queryKey: SUPPORT_KEYS.list(),
    queryFn:  () => api.support.listMine(),
    enabled:  !!session,
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: SUPPORT_KEYS.detail(typeof view==='object' ? view.id : ''),
    queryFn:  () => api.support.get(typeof view==='object' ? view.id : ''),
    enabled:  typeof view==='object',
  });

  const { data: messages } = useQuery({
    queryKey: SUPPORT_KEYS.messages(typeof view==='object' ? view.id : ''),
    queryFn:  () => api.support.getMessages(typeof view==='object' ? view.id : ''),
    enabled:  typeof view==='object',
  });

  const form = useForm<NewTicketInput>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: { subject:'', description:'', category:'booking' },
  });

  const createMutation = useMutation({
    mutationFn: (values: NewTicketInput) => api.support.create(values),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.list() });
      toast('Support ticket created.', 'success');
      const t = ticket as Record<string,unknown>;
      setView({ id: t['_id'] as string });
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to create ticket.', 'error'),
  });

  const replyMutation = useMutation({
    mutationFn: (id: string) => api.support.addMessage(id, replyText),
    onSuccess: () => {
      setReplyText('');
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.messages(typeof view==='object' ? view.id : '') });
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to send reply.', 'error'),
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => api.support.rate(id, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.detail(typeof view==='object' ? view.id : '') });
      toast('Thank you for your feedback.', 'success');
    },
  });

  const all = ((tickets as { data?: Record<string,unknown>[] } | undefined)?.data) ?? [];

  // ── New ticket form ─────────────────────────────────────────────────────────
  if (view === 'new') {
    return (
      <div data-page>
        <button type="button" onClick={() => setView('list')}
          style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', color:'var(--color-text-secondary)', fontSize:'var(--text-sm)', marginBottom:'var(--space-4)', cursor:'pointer' }}>
          <Icons.ChevronLeft size={16} /> Back to support
        </button>
        <h1 data-page-title>New support request</h1>
        <form onSubmit={form.handleSubmit((v) => void createMutation.mutate(v))} noValidate
          style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)', maxWidth:560 }}>
          <div data-form-group>
            <label htmlFor="cat">Category</label>
            <select id="cat" {...form.register('category')}>
              <option value="booking">Booking issue</option>
              <option value="billing">Billing issue</option>
              <option value="technical">Technical issue</option>
              <option value="complaint">Complaint</option>
              <option value="account">Account / profile</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div data-form-group>
            <label htmlFor="subj">Subject</label>
            <input id="subj" type="text" placeholder="Brief description of your issue" {...form.register('subject')} />
            <InlineError message={form.formState.errors.subject?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="desc">Message</label>
            <textarea id="desc" rows={6} placeholder="Describe your issue in detail. Include booking numbers or reference IDs where relevant." {...form.register('description')} />
            <InlineError message={form.formState.errors.description?.message} />
          </div>
          <div style={{ display:'flex', gap:'var(--space-3)' }}>
            <button type="button" data-btn-ghost onClick={() => setView('list')}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Ticket detail ───────────────────────────────────────────────────────────
  if (typeof view === 'object') {
    const ticket = ticketDetail as Record<string,unknown> | undefined;
    const msgList = (messages as Record<string,unknown>[] | undefined) ?? [];
    const status  = ticket?.['status'] as string ?? '';
    const isResolved = status === 'resolved' || status === 'closed';

    return (
      <div data-page>
        <button type="button" onClick={() => setView('list')}
          style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', color:'var(--color-text-secondary)', fontSize:'var(--text-sm)', marginBottom:'var(--space-4)', cursor:'pointer' }}>
          <Icons.ChevronLeft size={16} /> Back to support
        </button>
        {detailLoading ? <SkeletonLoader rows={4} /> : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)', marginBottom:'var(--space-5)' }}>
              <div>
                <h1 data-page-title style={{ marginBottom:'var(--space-1)' }}>{ticket?.['subject'] as string}</h1>
                <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', fontFamily:'monospace' }}>
                  #{ticket?.['ticketNumber'] as string ?? view.id}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Message thread */}
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)', marginBottom:'var(--space-6)' }}>
              {msgList.map((m) => {
                const msg       = m as Record<string,unknown>;
                const isStaff   = msg['senderType'] === 'platform';
                const sentAt    = new Date(msg['createdAt'] as string).toLocaleString('en-ZA', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
                return (
                  <div key={msg['_id'] as string}
                    style={{ display:'flex', flexDirection:'column', alignItems: isStaff ? 'flex-start' : 'flex-end', gap:'var(--space-1)' }}>
                    <div style={{
                      maxWidth:'80%', padding:'var(--space-4)', borderRadius:'var(--radius-lg)',
                      background: isStaff ? 'var(--color-surface)' : 'var(--color-primary)',
                      color: isStaff ? 'var(--color-text-primary)' : 'white',
                      border: isStaff ? '1px solid var(--color-border)' : 'none',
                      fontSize:'var(--text-sm)', lineHeight:'var(--leading-relaxed)',
                    }}>
                      {msg['body'] as string}
                    </div>
                    <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>
                      {isStaff ? 'Support team' : 'You'} · {sentAt}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rating (resolved tickets) */}
            {isResolved && !(ticket?.['rating']) && (
              <div data-card-padded style={{ marginBottom:'var(--space-5)', textAlign:'center' }}>
                <p style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-semibold)', marginBottom:'var(--space-3)' }}>
                  How would you rate this support experience?
                </p>
                <div style={{ display:'flex', gap:'var(--space-3)', justifyContent:'center' }}>
                  {[1,2,3,4,5].map((r) => (
                    <button key={r} type="button"
                      style={{ cursor:'pointer', background:'none', border:'none', color: 'var(--color-warning)', display: 'flex' }}
                      onClick={() => rateMutation.mutate({ id: view.id, rating: r })}>
                      <Icons.Star size={28} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply box */}
            {!isResolved && (
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                <textarea rows={4} placeholder="Type your reply…" value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ padding:'var(--space-3)', border:'1.5px solid var(--color-border)', borderRadius:'var(--radius-md)', fontSize:'var(--text-sm)', resize:'vertical', fontFamily:'inherit', outline:'none' }} />
                <button type="button" data-btn-primary
                  disabled={!replyText.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate(view.id)}>
                  {replyMutation.isPending ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Ticket list ─────────────────────────────────────────────────────────────
  return (
    <div data-page>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-6)', flexWrap:'wrap', gap:'var(--space-3)' }}>
        <div>
          <h1 data-page-title>Support</h1>
          <p data-page-subtitle>Your support requests with StayOS</p>
        </div>
        <button type="button" data-btn-primary onClick={() => setView('new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icons.Plus size={16} /> New request
        </button>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : all.length === 0 ? (
        <EmptyState title="No support tickets" description="Need help? Open a new support request."
          action={<button type="button" data-btn-primary onClick={() => setView('new')}>Open a request</button>} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
          {all.map((t) => {
            const ticket  = t as Record<string,unknown>;
            const status  = ticket['status'] as string;
            const created = new Date(ticket['createdAt'] as string).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
            return (
              <button key={ticket['_id'] as string} type="button"
                onClick={() => setView({ id: ticket['_id'] as string })}
                data-card-padded style={{ textAlign:'left', cursor:'pointer', display:'grid', gridTemplateColumns:'1fr auto', gap:'var(--space-4)', alignItems:'center', width:'100%' }}>
                <div>
                  <div style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-semibold)', marginBottom:'4px' }}>
                    {ticket['subject'] as string}
                  </div>
                  <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>
                    #{ticket['ticketNumber'] as string ?? ticket['_id'] as string} · {created}
                  </div>
                </div>
                <StatusBadge status={status} />
              </button>
            );
          })}
        </div>
      )}

      <div data-support-callout style={{ marginTop:'var(--space-8)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon><Icons.BookOpen size={20} /></span>
          <div>
            <strong>Help Centre</strong>
            <p>Browse guides, FAQs and troubleshooting articles.</p>
          </div>
        </div>
        <a href={`${PUBLIC_SITE_URL}/help`} target="_blank" rel="noopener noreferrer" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Visit Help Centre <Icons.ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
