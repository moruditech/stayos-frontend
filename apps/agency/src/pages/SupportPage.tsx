import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, useToast, Icons } from '@stayos/ui';
import { agencySupportKeys } from '../lib/query-keys';
import { formatDateTime, timeAgo, titleCase } from '../lib/format';

interface TicketForm {
  category: string;
  subject: string;
  description: string;
  [key: string]: unknown;
}

export default function SupportPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  if (location.pathname === '/support/new') return <NewTicketView />;
  if (id) return <TicketDetailView id={id} />;
  return <TicketListView />;
}

function TicketListView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({
    queryKey: agencySupportKeys.mine({ page }),
    queryFn: () => api.support.listMine({ page, limit: 20 }),
  });

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Your agency's own support tickets with LekkerQ."
        actions={
          <button data-btn-primary onClick={() => navigate('/support/new')}>
            <Icons.Plus /> New Ticket
          </button>
        }
      />
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.LifeBuoy} title="No support tickets" description="Raise a ticket if something isn't working as expected." />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead>
                  <tr><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {data.data.map((t) => (
                    <tr key={String(t['_id'])} data-clickable onClick={() => navigate(`/support/${t['_id']}`)}>
                      <td>
                        <div data-cell-entity-name>{String(t['subject'])}</div>
                        <div data-cell-entity-sub>{String(t['ticketNumber'] ?? '')}</div>
                      </td>
                      <td>{titleCase(String(t['category'] ?? ''))}</td>
                      <td><span data-priority-dot data-priority={String(t['priority'])} /> {titleCase(String(t['priority'] ?? ''))}</td>
                      <td><span data-status-badge data-status={String(t['status'])}>{String(t['status']).replace('_', ' ')}</span></td>
                      <td>{timeAgo(String(t['updatedAt'] ?? ''))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} tickets</span>
                <button data-pagination-prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                <span data-pagination-current>{page} / {data.meta.totalPages}</span>
                <button data-pagination-next disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            ) : null}
          </div>
        )}
      </Panel>
    </div>
  );
}

function NewTicketView(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<TicketForm>({ defaultValues: { category: 'technical', subject: '', description: '' } });

  const mutation = useMutation({
    mutationFn: (input: TicketForm) => api.support.create(input),
    onSuccess: (ticket) => {
      toast('Ticket raised — we\u2019ll be in touch.', 'success');
      queryClient.invalidateQueries({ queryKey: agencySupportKeys.mine() });
      navigate(`/support/${(ticket as Record<string, unknown>)['_id'] ?? ''}`);
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not raise ticket', 'error'),
  });

  return (
    <div>
      <PageHeader title="New Support Ticket" />
      <div style={{ maxWidth: 560 }}>
        <Panel>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div data-form-group>
              <label>Category</label>
              <select {...form.register('category')}>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="booking">Booking</option>
                <option value="account">Account</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div data-form-group>
              <label>Subject</label>
              <input {...form.register('subject', { required: true })} />
            </div>
            <div data-form-group>
              <label>Description</label>
              <textarea rows={5} {...form.register('description', { required: true })} />
            </div>
            <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-6)' }}>
              <button type="button" data-btn-secondary onClick={() => navigate('/support')}>Cancel</button>
              <button type="submit" data-btn-primary disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending…' : 'Raise Ticket'}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function TicketDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reply, setReply] = React.useState('');
  const [rating, setRating] = React.useState(0);

  const { data: ticket, isLoading } = useQuery({ queryKey: agencySupportKeys.detail(id), queryFn: () => api.support.get(id) });

  const replyMutation = useMutation({
    mutationFn: (body: string) => api.support.addMessage(id, body),
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: agencySupportKeys.detail(id) });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not send message', 'error'),
  });

  const rateMutation = useMutation({
    mutationFn: (r: number) => api.support.rate(id, r),
    onSuccess: () => {
      toast('Thanks for the feedback.', 'success');
      queryClient.invalidateQueries({ queryKey: agencySupportKeys.detail(id) });
    },
  });

  if (isLoading) return <LoadingBlock rows={4} />;
  if (!ticket) return <EmptyBlock icon={Icons.LifeBuoy} title="Ticket not found" />;

  const t = ticket as Record<string, unknown>;
  const messages = (t['messages'] as Array<Record<string, unknown>>) ?? [];
  const status = String(t['status']);

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/support'); }}>Support</a>
        <Icons.ChevronRight /> <span>{String(t['ticketNumber'] ?? '')}</span>
      </div>
      <PageHeader
        title={String(t['subject'])}
        subtitle={`${String(t['ticketNumber'] ?? '')} — ${titleCase(String(t['category'] ?? ''))}`}
        actions={<span data-status-badge data-status={status}>{status.replace('_', ' ')}</span>}
      />

      <Panel title="Conversation">
        <div data-timeline>
          <div data-timeline-item>
            <span data-timeline-dot />
            <div data-timeline-body>
              <div data-timeline-title>Original request</div>
              <div data-timeline-meta>{formatDateTime(String(t['createdAt'] ?? ''))}</div>
              <div data-timeline-note>{String(t['description'] ?? '')}</div>
            </div>
          </div>
          {messages.filter((m) => !m['isInternal']).map((m, i) => (
            <div key={i} data-timeline-item>
              <span data-timeline-dot />
              <div data-timeline-body>
                <div data-timeline-title>{String(m['senderModel'] ?? 'Reply')}</div>
                <div data-timeline-meta>{formatDateTime(String(m['sentAt'] ?? ''))}</div>
                <div data-timeline-note>{String(m['body'] ?? '')}</div>
              </div>
            </div>
          ))}
        </div>

        {status !== 'closed' ? (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <div data-form-group>
              <label>Add a reply</label>
              <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
            </div>
            <button data-btn-primary data-btn-sm disabled={!reply.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate(reply)}>
              <Icons.Send /> {replyMutation.isPending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        ) : !t['satisfactionRating'] ? (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <span data-eyebrow>Rate this resolution</span>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} data-btn-ghost data-btn-sm onClick={() => { setRating(n); rateMutation.mutate(n); }}>
                  <Icons.Star size={16} style={{ color: n <= rating ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
