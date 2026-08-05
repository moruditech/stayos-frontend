import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, useToast, Modal, Icons } from '@stayos/ui';
import { supportKeys, platformKeys } from '../lib/query-keys';
import { formatDateTime, timeAgo, titleCase } from '../lib/format';

export default function SupportPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  if (id) return <TicketDetailView id={id} />;
  return <TicketQueueView />;
}

function TicketQueueView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('open');
  const [priority, setPriority] = React.useState('all');

  const { data, isLoading } = useQuery({
    queryKey: supportKeys.tickets({ page, status, priority }),
    queryFn: () => api.support.listAll({
      page, limit: 20,
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority,
    }),
  });

  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="Full queue across every portal — not just your own tickets." />

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="pending_user">Pending user</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label data-filter-select>
          <span>Priority</span>
          <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.LifeBuoy} title="No tickets match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Ticket</th><th>Requester</th><th>Priority</th><th>Assigned to</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  {data.data.map((t) => (
                    <tr key={String(t['_id'])} data-clickable onClick={() => navigate(`/support/tickets/${t['_id']}`)}>
                      <td>
                        <div data-cell-entity-name>{String(t['subject'])}</div>
                        <div data-cell-entity-sub>{String(t['ticketNumber'] ?? '')} · {titleCase(String(t['category'] ?? ''))}</div>
                      </td>
                      <td>{String(t['raiserModel'] ?? '')}</td>
                      <td><span data-priority-dot data-priority={String(t['priority'])} /> {titleCase(String(t['priority'] ?? ''))}</td>
                      <td>{t['assignedTo'] ? `${(t['assignedTo'] as Record<string, unknown>)['firstName']} ${(t['assignedTo'] as Record<string, unknown>)['lastName']}` : 'Unassigned'}</td>
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

function TicketDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reply, setReply] = React.useState('');
  const [isInternal, setIsInternal] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignee, setAssignee] = React.useState('');

  const { data: ticket, isLoading } = useQuery({ queryKey: supportKeys.ticket(id), queryFn: () => api.support.get(id) });
  const { data: staffList } = useQuery({ queryKey: platformKeys.users({ limit: 100 }), queryFn: () => api.platform.listUsers({ limit: 100 }), enabled: assignOpen });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: supportKeys.ticket(id) });

  const replyMutation = useMutation({
    mutationFn: () => api.support.addMessage(id, reply, isInternal),
    onSuccess: () => { setReply(''); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not send message', 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) => api.support.assign(id, assigneeId),
    onSuccess: () => { toast('Ticket assigned.', 'success'); setAssignOpen(false); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not assign ticket', 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.support.updateStatus(id, status),
    onSuccess: () => { toast('Status updated.', 'success'); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update status', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={4} />;
  if (!ticket) return <EmptyBlock icon={Icons.LifeBuoy} title="Ticket not found" />;

  const t = ticket as Record<string, unknown>;
  const messages = (t['messages'] as Array<Record<string, unknown>>) ?? [];
  const status = String(t['status']);

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/support/tickets'); }}>Support Tickets</a>
        <Icons.ChevronRight /> <span>{String(t['ticketNumber'] ?? '')}</span>
      </div>
      <PageHeader
        title={String(t['subject'])}
        subtitle={`${String(t['ticketNumber'] ?? '')} · ${titleCase(String(t['category'] ?? ''))} · raised by ${String(t['raiserModel'] ?? '')}`}
        actions={
          <>
            <button data-btn-secondary onClick={() => setAssignOpen(true)}>
              <Icons.UserPlus /> Assign
            </button>
            <select data-select value={status} onChange={(e) => statusMutation.mutate(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="pending_user">Pending user</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </>
        }
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
          {messages.map((m, i) => (
            <div key={i} data-timeline-item>
              <span data-timeline-dot style={{ background: m['isInternal'] ? 'var(--color-warning)' : 'var(--color-primary)' }} />
              <div data-timeline-body>
                <div data-timeline-title>
                  {String(m['senderModel'] ?? 'Reply')}
                  {m['isInternal'] ? <span data-status-badge data-status="pending" style={{ marginLeft: 6 }}>Internal note</span> : null}
                </div>
                <div data-timeline-meta>{formatDateTime(String(m['sentAt'] ?? ''))}</div>
                <div data-timeline-note>{String(m['body'] ?? '')}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <div data-form-group>
            <label>Reply</label>
            <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label data-checkbox-label>
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal note (not visible to requester)
            </label>
            <button data-btn-primary data-btn-sm disabled={!reply.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate()}>
              <Icons.Send /> {replyMutation.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </Panel>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign ticket">
        <div data-form-group>
          <label>Team member</label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select…</option>
            {(staffList?.data ?? []).map((u) => (
              <option key={u._id} value={u._id}>{u.firstName} {u.lastName} — {titleCase(u.role)}</option>
            ))}
          </select>
        </div>
        <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
          <button type="button" data-btn-secondary onClick={() => setAssignOpen(false)}>Cancel</button>
          <button
            type="button"
            data-btn-primary
            disabled={!assignee || assignMutation.isPending}
            onClick={() => assignMutation.mutate(assignee)}
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
