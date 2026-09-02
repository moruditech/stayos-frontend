import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, EmptyBlock, useToast, Modal, Icons } from '@stayos/ui';
import { mailboxKeys, platformKeys } from '../lib/query-keys';
import { formatDateTime, timeAgo, titleCase } from '../lib/format';

export default function MailboxPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  if (id) return <ThreadDetailView id={id} />;
  return <ThreadQueueView />;
}

function ThreadQueueView(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('open');

  const { data, isLoading } = useQuery({
    queryKey: mailboxKeys.threads({ page, status }),
    queryFn: () => api.mailbox.listThreads({
      page, limit: 20,
      status: status === 'all' ? undefined : status,
    }),
  });

  return (
    <div>
      <PageHeader title="Mailbox" subtitle="Inquiries submitted through the public contact form." />

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="pending">Pending (awaiting reply)</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Inbox} title="No inquiries match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>From</th><th>Subject</th><th>Category</th><th>Assigned to</th><th>Status</th><th>Last activity</th></tr></thead>
                <tbody>
                  {data.data.map((t) => (
                    <tr
                      key={String(t['id'])}
                      data-clickable
                      style={t['unreadByStaff'] ? { fontWeight: 600 } : undefined}
                      onClick={() => navigate(`/mailbox/${t['id']}`)}
                    >
                      <td>
                        <div data-cell-entity-name>{String(t['inquirerName'] ?? '')}</div>
                        <div data-cell-entity-sub>{String(t['inquirerEmailMasked'] ?? '')}</div>
                      </td>
                      <td>{String(t['subject'] ?? '')}</td>
                      <td>{titleCase(String(t['category'] ?? ''))}</td>
                      <td>
                        {t['assignedTo']
                          ? `${(t['assignedTo'] as Record<string, unknown>)['firstName']} ${(t['assignedTo'] as Record<string, unknown>)['lastName']}`
                          : 'Unassigned'}
                      </td>
                      <td><span data-status-badge data-status={String(t['status'])}>{titleCase(String(t['status']))}</span></td>
                      <td>{timeAgo(String(t['lastMessageAt'] ?? ''))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} inquiries</span>
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

function ThreadDetailView({ id }: { id: string }): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reply, setReply] = React.useState('');
  const [isNote, setIsNote] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignee, setAssignee] = React.useState('');

  const { data: thread, isLoading } = useQuery({ queryKey: mailboxKeys.thread(id), queryFn: () => api.mailbox.getThread(id) });
  const { data: staffList } = useQuery({ queryKey: platformKeys.users({ limit: 100 }), queryFn: () => api.platform.listUsers({ limit: 100 }), enabled: assignOpen });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: mailboxKeys.thread(id) });
    queryClient.invalidateQueries({ queryKey: ['mailbox', 'threads'] });
  };

  const replyMutation = useMutation({
    mutationFn: () => (isNote ? api.mailbox.addNote(id, reply) : api.mailbox.reply(id, reply)),
    onSuccess: () => { setReply(''); toast(isNote ? 'Note added.' : 'Reply sent.', 'success'); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not send', 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) => api.mailbox.assign(id, assigneeId),
    onSuccess: () => { toast('Thread assigned.', 'success'); setAssignOpen(false); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not assign thread', 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.mailbox.updateStatus(id, status),
    onSuccess: () => { toast('Status updated.', 'success'); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not update status', 'error'),
  });

  if (isLoading) return <LoadingBlock rows={4} />;
  if (!thread) return <EmptyBlock icon={Icons.Inbox} title="Thread not found" />;

  const t = thread as Record<string, unknown>;
  const inquirer = (t['inquirer'] as Record<string, unknown>) ?? {};
  const messages = (t['messages'] as Array<Record<string, unknown>>) ?? [];
  const status = String(t['status']);

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/mailbox'); }}>Mailbox</a>
        <Icons.ChevronRight /> <span>{String(t['subject'] ?? '')}</span>
      </div>
      <PageHeader
        title={String(t['subject'] ?? '')}
        subtitle={`${String(inquirer['name'] ?? '')} · ${String(inquirer['email'] ?? '')} · ${titleCase(String(inquirer['category'] ?? ''))}`}
        actions={
          <>
            <button data-btn-secondary onClick={() => setAssignOpen(true)}>
              <Icons.UserPlus /> Assign
            </button>
            <select data-select value={status} onChange={(e) => statusMutation.mutate(e.target.value)}>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </>
        }
      />

      <Panel title="Conversation">
        <div data-timeline>
          {messages.map((m, i) => (
            <div key={i} data-timeline-item>
              <span
                data-timeline-dot
                style={{
                  background: m['isInternalNote']
                    ? 'var(--color-warning)'
                    : m['direction'] === 'inbound' ? 'var(--color-primary)' : 'var(--color-success, #1b7a4a)',
                }}
              />
              <div data-timeline-body>
                <div data-timeline-title>
                  {m['direction'] === 'inbound' ? String(inquirer['name'] ?? 'Inquirer') : (m['senderType'] === 'system' ? 'Auto-reply' : 'Staff')}
                  {m['isInternalNote'] ? <span data-status-badge data-status="pending" style={{ marginLeft: 6 }}>Internal note</span> : null}
                </div>
                <div data-timeline-meta>{formatDateTime(String(m['sentAt'] ?? ''))}</div>
                <div data-timeline-note dangerouslySetInnerHTML={{ __html: String(m['bodyHtml'] ?? '') }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <div data-form-group>
            <label>{isNote ? 'Internal note' : 'Reply'}</label>
            <textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label data-checkbox-label>
              <input type="checkbox" checked={isNote} onChange={(e) => setIsNote(e.target.checked)} />
              Internal note (not emailed to the inquirer)
            </label>
            <button data-btn-primary data-btn-sm disabled={!reply.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate()}>
              <Icons.Send /> {replyMutation.isPending ? 'Sending…' : (isNote ? 'Add note' : 'Send reply')}
            </button>
          </div>
        </div>
      </Panel>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign thread">
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
