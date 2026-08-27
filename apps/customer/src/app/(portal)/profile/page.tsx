'use client';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { ConfirmDialog, useToast, InlineError, SkeletonLoader, Icons } from '@stayos/ui';
import { profileKeys } from '@/lib/query-keys';

// ── Inline PII reveal field ───────────────────────────────────────────────────
// PiiField only toggles local display; the real value must come from the
// reveal endpoint. This component handles the API call and shows the result.
type RevealState = 'masked' | 'loading' | 'revealed';

function RevealField({ field, label }: { field: string; label: string }): React.ReactElement {
  const [state, setState]       = useState<RevealState>('masked');
  const [realValue, setRealValue] = useState('');
  const { toast }               = useToast();
  const MASK                    = '••••••••';

  async function handleReveal(): Promise<void> {
    if (state === 'revealed') { setState('masked'); return; }
    setState('loading');
    try {
      const res = await api.customer.revealField(field);
      const r   = res as { value?: string } | undefined;
      setRealValue(r?.value ?? '');
      setState('revealed');
    } catch (err) {
      const apiErr = err as ApiError;
      toast(apiErr.message ?? 'Could not reveal field.', 'error');
      setState('masked');
    }
  }

  return (
    <div data-pii-field>
      <span data-pii-label>{label}</span>
      <span data-pii-value aria-label={label}>
        {state === 'revealed' ? realValue : MASK}
      </span>
      <button type="button" data-pii-reveal onClick={() => void handleReveal()} disabled={state === 'loading'}>
        {state === 'loading' ? '…' : state === 'revealed' ? 'Hide' : 'Reveal'}
      </button>
    </div>
  );
}

// ── Communication prefs ───────────────────────────────────────────────────────
const COMM_CHANNELS = ['email', 'sms', 'whatsapp', 'push'] as const;
type CommChannel = typeof COMM_CHANNELS[number];
const CHANNEL_LABELS: Record<CommChannel, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', push: 'Push notifications',
};

function CommPrefsSection({ profile }: { profile: Record<string, unknown> }): React.ReactElement {
  const { toast } = useToast();

  const rawPrefs  = (profile['commPrefs'] as Record<string, boolean>) ?? {};
  const [prefs, setPrefs] = useState<Record<CommChannel, boolean>>({
    email:    !!rawPrefs['email'],
    sms:      !!rawPrefs['sms'],
    whatsapp: !!rawPrefs['whatsapp'],
    push:     !!rawPrefs['push'],
  });

  // Sync if profile data changes (e.g. after save)
  useEffect(() => {
    const rp = (profile['commPrefs'] as Record<string, boolean>) ?? {};
    setPrefs({ email: !!rp['email'], sms: !!rp['sms'], whatsapp: !!rp['whatsapp'], push: !!rp['push'] });
  }, [profile]);

  const qc = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: (p: Record<CommChannel, boolean>) => api.customer.updateCommPrefs(p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: profileKeys.me() }); toast('Communication preferences saved.', 'success'); },
    onError:    (err: ApiError) => toast(err.message ?? 'Save failed.', 'error'),
  });

  return (
    <div data-card-padded>
      <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>Communication preferences</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {COMM_CHANNELS.map((ch) => (
          <label key={ch} data-checkbox-label style={{ justifyContent: 'space-between' }}>
            <span>{CHANNEL_LABELS[ch]}</span>
            <input
              type="checkbox"
              checked={prefs[ch]}
              onChange={(e) => setPrefs((prev) => ({ ...prev, [ch]: e.target.checked }))}
            />
          </label>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <button
          type="button"
          data-btn-primary
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(prefs)}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

// ── Main profile page ─────────────────────────────────────────────────────────
export default function ProfilePage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab]               = useState<'profile' | 'security' | 'data'>('profile');
  const [editing, setEditing]       = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: profileKeys.me(),
    queryFn:  () => api.customer.getMe(),
    enabled:  !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.customer.updateMe(v),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      toast('Profile updated.', 'success');
      setEditing(false);
    },
    onError: (err: ApiError) => toast(err.message ?? 'Update failed.', 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.customer.requestDataExport(),
    onSuccess:  () => setExportDone(true),
    onError:    (err: ApiError) => toast(err.message ?? 'Export failed.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.customer.deleteAccount(),
    onSuccess:  () => { window.location.href = '/login'; },
    onError:    (err: ApiError) => toast(err.message ?? 'Deletion failed.', 'error'),
  });

  const form = useForm<Record<string, string>>({ defaultValues: { firstName: '', lastName: '', email: '' } });

  const resetForm = useCallback(() => {
    if (!profile) return;
    const p = profile as Record<string, unknown>;
    form.reset({
      firstName: p['firstName'] as string ?? '',
      lastName:  p['lastName']  as string ?? '',
      email:     p['email']     as string ?? '',
    });
  }, [profile, form]);

  useEffect(() => { resetForm(); }, [resetForm]);

  // Reset form and exit edit mode when tab changes
  useEffect(() => { setEditing(false); resetForm(); }, [tab, resetForm]);

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const p        = profile as Record<string, unknown> | undefined;
  const initials = `${(p?.['firstName'] as string)?.[0] ?? ''}${(p?.['lastName'] as string)?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div data-page>
      <h1 data-page-title>Profile</h1>

      {/* ── Avatar card ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-6)', padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>{p?.['firstName'] as string} {p?.['lastName'] as string}</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{p?.['email'] as string}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4, textTransform: 'capitalize' }}>{(session?.role ?? '').replace(/_/g, ' ')}</div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div data-filter-tabs style={{ marginBottom: 'var(--space-6)' }}>
        {([{ id: 'profile', label: 'Personal info' }, { id: 'security', label: 'Security' }, { id: 'data', label: 'My data' }] as const).map((t) => (
          <button key={t.id} type="button" data-filter-tab data-active={tab === t.id ? '' : undefined} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── Personal info ────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Personal info card */}
          <div data-card-padded>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Personal information</h3>
              {!editing && (
                <button type="button" data-btn-secondary onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icons.Pencil size={14} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={form.handleSubmit((v) => void updateMutation.mutate(v))} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div data-form-group>
                    <label htmlFor="fn">First name</label>
                    <input id="fn" type="text" autoComplete="given-name" {...form.register('firstName')} />
                    <InlineError message={form.formState.errors['firstName']?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="ln">Last name</label>
                    <input id="ln" type="text" autoComplete="family-name" {...form.register('lastName')} />
                    <InlineError message={form.formState.errors['lastName']?.message} />
                  </div>
                </div>
                <div data-form-group>
                  <label htmlFor="em">Email address</label>
                  <input id="em" type="email" autoComplete="email" {...form.register('email')} />
                  <InlineError message={form.formState.errors['email']?.message} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button type="button" data-btn-ghost onClick={() => { setEditing(false); resetForm(); }}>Cancel</button>
                  <button type="submit" disabled={updateMutation.isPending} data-btn-primary>
                    {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>First name</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{p?.['firstName'] as string || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>Last name</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{p?.['lastName'] as string || '—'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>Email address</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{p?.['email'] as string || '—'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Protected PII fields — reveal calls POST /customers/me/reveal */}
          <div data-card-padded>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>Protected information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <RevealField field="phone"       label="Phone number" />
              <RevealField field="idNumber"    label="ID number" />
              <RevealField field="dateOfBirth" label="Date of birth" />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>
              These fields are masked for your security. Each reveal is logged and rate-limited.
            </p>
          </div>

          {/* Communication prefs */}
          {p && <CommPrefsSection profile={p} />}
        </div>
      )}

      {/* ── Security ─────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div data-card-padded>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>Change password</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>Changing your password signs out all other active sessions.</p>
            <Link href="/profile/password" data-btn-secondary>Change password →</Link>
          </div>
          <div data-card-padded>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-3)' }}>Connected accounts</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: '#4285F4' }}>G</span>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Google</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{p?.['oAuthProvider'] === 'google' ? 'Connected' : 'Not connected'}</div>
                </div>
              </div>
              {p?.['oAuthProvider'] !== 'google' && <a href="/api/v1/auth/google" data-btn-secondary>Connect</a>}
            </div>
          </div>
        </div>
      )}

      {/* ── My data ──────────────────────────────────────────────────── */}
      {tab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div data-card-padded>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Export my data</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 'var(--leading-relaxed)' }}>
              Download a copy of your personal data — profile, bookings, payments, reviews, complaints, loyalty account, and all consent records held for your account.
            </p>
            {exportDone ? (
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Icons.CheckCircle2 size={16} /> Export requested. You will receive an email with a download link within 24 hours.
              </div>
            ) : (
              <button type="button" data-btn-secondary disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
                {exportMutation.isPending ? 'Requesting…' : 'Request data export'}
              </button>
            )}
          </div>

          <div data-card-padded style={{ borderColor: 'var(--color-error)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>Delete account</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', lineHeight: 'var(--leading-relaxed)' }}>
              Deleting your account deactivates it immediately and revokes all active sessions. Personal data is removed from active records within 30 days.
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 'var(--leading-relaxed)' }}>
              <strong>Note:</strong> A record of your consent history is retained permanently as required for compliance purposes, even after deletion. This cannot be removed.
            </p>
            <button type="button" data-btn-ghost style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => setDeleteOpen(true)}>
              Delete my account
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        message="Your account will be deactivated immediately and personal data removed within 30 days. Consent records are retained permanently as required by law. This cannot be undone."
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Yes, delete my account'}
        cancelLabel="Keep account"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
