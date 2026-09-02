import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, StatCard, LoadingBlock, EmptyBlock, useToast, Modal, Icons } from '@stayos/ui';
import { newsletterKeys } from '../lib/query-keys';
import { formatDateTime, titleCase } from '../lib/format';

const CAMPAIGN_TYPES = ['newsletter', 'promotion', 'announcement', 'product_update'] as const;

type Tab = 'subscribers' | 'templates' | 'campaigns';

export default function NewsletterPage(): React.ReactElement {
  const [tab, setTab] = React.useState<Tab>('subscribers');

  return (
    <div>
      <PageHeader title="Newsletter" subtitle="Subscribers, email templates, and campaign sends for the StayOS mailing list." />

      <div data-filter-bar>
        {tab === 'subscribers'
          ? <button data-btn-primary data-btn-sm onClick={() => setTab('subscribers')}>Subscribers</button>
          : <button data-btn-secondary data-btn-sm onClick={() => setTab('subscribers')}>Subscribers</button>}
        {tab === 'templates'
          ? <button data-btn-primary data-btn-sm onClick={() => setTab('templates')}>Templates</button>
          : <button data-btn-secondary data-btn-sm onClick={() => setTab('templates')}>Templates</button>}
        {tab === 'campaigns'
          ? <button data-btn-primary data-btn-sm onClick={() => setTab('campaigns')}>Campaigns</button>
          : <button data-btn-secondary data-btn-sm onClick={() => setTab('campaigns')}>Campaigns</button>}
      </div>

      {tab === 'subscribers' ? <SubscribersTab /> : null}
      {tab === 'templates' ? <TemplatesTab /> : null}
      {tab === 'campaigns' ? <CampaignsTab /> : null}
    </div>
  );
}

// ── Subscribers ─────────────────────────────────────────────────────────

function SubscribersTab(): React.ReactElement {
  const { toast } = useToast();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('subscribed');

  const { data: stats } = useQuery({ queryKey: newsletterKeys.stats(), queryFn: () => api.newsletter.getStats() });
  const { data, isLoading } = useQuery({
    queryKey: newsletterKeys.subscribers({ page, status }),
    queryFn: () => api.newsletter.listSubscribers({
      page, limit: 20,
      status: status === 'all' ? undefined : (status as 'subscribed' | 'unsubscribed'),
    }),
  });

  const revealMutation = useMutation({
    mutationFn: (id: string) => api.newsletter.revealSubscriberEmail(id),
    onSuccess: (result) => toast(`Email: ${result.email}`, 'success'),
    onError: (err) => toast((err as ApiError).message ?? 'Could not reveal email', 'error'),
  });

  return (
    <div>
      {stats ? (
        <div data-stat-grid>
          <StatCard icon={Icons.Mail} tone="green" label="Subscribed" value={stats.subscribed} />
          <StatCard icon={Icons.X} tone="rose" label="Unsubscribed" value={stats.unsubscribed} />
          <StatCard icon={Icons.Users} tone="blue" label="Total ever subscribed" value={stats.total} />
        </div>
      ) : null}

      <div data-filter-bar>
        <label data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </label>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock icon={Icons.Mail} title="No subscribers match these filters" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Email</th><th>Source</th><th>Status</th><th>Subscribed</th><th /></tr></thead>
                <tbody>
                  {data.data.map((s) => (
                    <tr key={String(s['id'])}>
                      <td>{String(s['emailMasked'] ?? '')}</td>
                      <td>{titleCase(String(s['source'] ?? ''))}</td>
                      <td><span data-status-badge data-status={String(s['status'])}>{titleCase(String(s['status']))}</span></td>
                      <td>{formatDateTime(String(s['subscribedAt'] ?? ''))}</td>
                      <td>
                        <button
                          data-btn-secondary data-btn-sm
                          disabled={revealMutation.isPending}
                          onClick={() => revealMutation.mutate(String(s['id']))}
                          title="Reveal full email address (audited)"
                        >
                          <Icons.Eye size={14} /> Reveal
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 ? (
              <div data-pagination>
                <span data-pagination-summary>{data.meta.total} subscribers</span>
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

// ── Templates ────────────────────────────────────────────────────────────

function TemplatesTab(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Record<string, unknown> | null>(null);
  const [form, setForm] = React.useState({ name: '', type: 'newsletter', subject: '', bodyHtml: '', previewText: '' });

  const { data: templates, isLoading } = useQuery({
    queryKey: newsletterKeys.templates(),
    queryFn: () => api.newsletter.listTemplates(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['newsletter', 'templates'] });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.newsletter.updateTemplate(String(editing['_id']), form)
      : api.newsletter.createTemplate(form),
    onSuccess: () => { toast(editing ? 'Template updated.' : 'Template created.', 'success'); setModalOpen(false); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not save template', 'error'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.newsletter.archiveTemplate(id),
    onSuccess: () => { toast('Template archived.', 'success'); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not archive template', 'error'),
  });

  function openCreate(): void {
    setEditing(null);
    setForm({ name: '', type: 'newsletter', subject: '', bodyHtml: '', previewText: '' });
    setModalOpen(true);
  }

  function openEdit(t: Record<string, unknown>): void {
    setEditing(t);
    setForm({
      name: String(t['name'] ?? ''),
      type: String(t['type'] ?? 'newsletter'),
      subject: String(t['subject'] ?? ''),
      bodyHtml: String(t['bodyHtml'] ?? ''),
      previewText: String(t['previewText'] ?? ''),
    });
    setModalOpen(true);
  }

  return (
    <div>
      <div data-page-header-actions style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button data-btn-primary onClick={openCreate}><Icons.Plus /> New template</button>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !templates || templates.length === 0 ? (
          <EmptyBlock icon={Icons.FileText} title="No templates yet" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Name</th><th>Type</th><th>Subject</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={String(t['_id'])}>
                      <td data-cell-entity-name>{String(t['name'] ?? '')}</td>
                      <td>{titleCase(String(t['type'] ?? ''))}</td>
                      <td>{String(t['subject'] ?? '')}</td>
                      <td>{formatDateTime(String(t['updatedAt'] ?? ''))}</td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button data-btn-secondary data-btn-sm onClick={() => openEdit(t)}><Icons.Pencil size={14} /></button>
                        <button data-btn-secondary data-btn-sm onClick={() => archiveMutation.mutate(String(t['_id']))}><Icons.Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit template' : 'New template'}>
        <div data-form-group>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div data-form-group>
          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>
        </div>
        <div data-form-group>
          <label>Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div data-form-group>
          <label>Preview text</label>
          <input value={form.previewText} onChange={(e) => setForm({ ...form, previewText: e.target.value })} />
        </div>
        <div data-form-group>
          <label>Body (HTML)</label>
          <textarea rows={8} value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} />
        </div>
        <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
          <button type="button" data-btn-secondary onClick={() => setModalOpen(false)}>Cancel</button>
          <button
            type="button"
            data-btn-primary
            disabled={!form.name || !form.subject || !form.bodyHtml || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Campaigns ────────────────────────────────────────────────────────────

function CampaignsTab(): React.ReactElement {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [confirmSendId, setConfirmSendId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ templateId: '', type: 'newsletter', subject: '', bodyHtml: '' });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: newsletterKeys.campaigns(),
    queryFn: () => api.newsletter.listCampaigns({ limit: 20 }),
  });
  const { data: templates } = useQuery({
    queryKey: newsletterKeys.templates(),
    queryFn: () => api.newsletter.listTemplates(),
    enabled: modalOpen,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['newsletter', 'campaigns'] });

  const createMutation = useMutation({
    mutationFn: () => api.newsletter.createCampaign(
      form.templateId
        ? { templateId: form.templateId, type: form.type }
        : { type: form.type, subject: form.subject, bodyHtml: form.bodyHtml }
    ),
    onSuccess: () => { toast('Campaign saved as draft.', 'success'); setModalOpen(false); invalidate(); },
    onError: (err) => toast((err as ApiError).message ?? 'Could not create campaign', 'error'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.newsletter.sendCampaign(id),
    onSuccess: (result) => {
      toast(`Campaign sent to ${(result as Record<string, unknown>)['queuedCount']} subscriber(s).`, 'success');
      setConfirmSendId(null);
      invalidate();
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not send campaign', 'error'),
  });

  return (
    <div>
      <div data-page-header-actions style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button data-btn-primary onClick={() => { setForm({ templateId: '', type: 'newsletter', subject: '', bodyHtml: '' }); setModalOpen(true); }}><Icons.Plus /> New campaign</button>
      </div>

      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !campaigns || campaigns.data.length === 0 ? (
          <EmptyBlock icon={Icons.Megaphone} title="No campaigns yet" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Subject</th><th>Type</th><th>Status</th><th>Recipients</th><th>Sent</th><th /></tr></thead>
                <tbody>
                  {campaigns.data.map((c) => (
                    <tr key={String(c['_id'])}>
                      <td data-cell-entity-name>{String(c['subject'] ?? '')}</td>
                      <td>{titleCase(String(c['type'] ?? ''))}</td>
                      <td><span data-status-badge data-status={String(c['status'])}>{titleCase(String(c['status']))}</span></td>
                      <td>{c['queuedCount'] != null ? String(c['queuedCount']) : '—'}</td>
                      <td>{c['sentAt'] ? formatDateTime(String(c['sentAt'])) : '—'}</td>
                      <td>
                        {c['status'] === 'draft' ? (
                          <button data-btn-primary data-btn-sm onClick={() => setConfirmSendId(String(c['_id']))}>
                            <Icons.Send size={14} /> Send
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New campaign">
        <div data-form-group>
          <label>Type of promoting</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>
        </div>
        <div data-form-group>
          <label>Start from a template (optional)</label>
          <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
            <option value="">— Write from scratch —</option>
            {(templates ?? []).map((t) => (
              <option key={String(t['_id'])} value={String(t['_id'])}>{String(t['name'])}</option>
            ))}
          </select>
        </div>
        {!form.templateId ? (
          <>
            <div data-form-group>
              <label>Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div data-form-group>
              <label>Message content (HTML)</label>
              <textarea rows={8} value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} />
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            The template&rsquo;s subject and content will be used as-is. Edit the template first if it needs changes.
          </p>
        )}
        <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
          <button type="button" data-btn-secondary onClick={() => setModalOpen(false)}>Cancel</button>
          <button
            type="button"
            data-btn-primary
            disabled={(!form.templateId && (!form.subject || !form.bodyHtml)) || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Saving…' : 'Save as draft'}
          </button>
        </div>
      </Modal>

      <Modal open={!!confirmSendId} onClose={() => setConfirmSendId(null)} title="Send campaign">
        <p>This will send this campaign to every currently subscribed address. This can&rsquo;t be undone. Continue?</p>
        <div data-modal-footer style={{ padding: 0, borderTop: 'none', marginTop: 'var(--space-5)' }}>
          <button type="button" data-btn-secondary onClick={() => setConfirmSendId(null)}>Cancel</button>
          <button
            type="button"
            data-btn-primary
            disabled={sendMutation.isPending}
            onClick={() => confirmSendId && sendMutation.mutate(confirmSendId)}
          >
            {sendMutation.isPending ? 'Sending…' : 'Send now'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
