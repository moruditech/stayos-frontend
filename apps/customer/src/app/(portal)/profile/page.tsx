'use client';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { ConfirmDialog, useToast, InlineError, SkeletonLoader, Icons } from '@stayos/ui';
import { profileKeys } from '@/lib/query-keys';

// ---------------------------------------------------------------------------
// RevealField — calls POST /customers/me/reveal; supports inline edit
// ---------------------------------------------------------------------------
function RevealField({
  fieldKey,
  label,
  inputType = 'text',
  onSave,
  isSaving,
}: {
  fieldKey: string;
  label: string;
  inputType?: string;
  onSave: (key: string, value: string) => void;
  isSaving: boolean;
}) {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState('');

  async function handleReveal() {
    setLoading(true);
    try {
      const result = await api.customer.revealField(fieldKey);
      setRevealed((result as { value: string }).value ?? null);
    } catch (err: unknown) {
      toast((err as ApiError).message ?? 'Reveal failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setDraft(revealed ?? '');
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setDraft('');
  }

  function handleSave() {
    onSave(fieldKey, draft);
    setEditing(false);
    setRevealed(null);
  }

  const displayValue = revealed ?? '•••••••••••';

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--space-3)', paddingBottom:'var(--space-3)', borderBottom:'1px solid var(--color-border)' }}>
      <div style={{ fontSize:'13px', color:'var(--color-text-secondary)', minWidth:120 }}>{label}</div>

      {editing ? (
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', flex:1 }}>
          <input
            type={inputType}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex:1 }}
            autoFocus
          />
          <button type="button" data-btn-primary onClick={handleSave} disabled={isSaving} style={{ fontSize:'12px', padding:'var(--space-1) var(--space-3)' }}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" data-btn-secondary onClick={handleCancel} style={{ fontSize:'12px', padding:'var(--space-1) var(--space-3)' }}>
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
          <span style={{ fontFamily:'monospace', fontSize:'13px' }}>{displayValue}</span>
          {revealed !== null ? (
            <>
              <button type="button" data-btn-ghost onClick={() => setRevealed(null)} style={{ fontSize:'12px' }}>Hide</button>
              <button type="button" data-btn-ghost onClick={handleEdit} style={{ fontSize:'12px' }}>Edit</button>
            </>
          ) : (
            <button type="button" data-btn-ghost onClick={handleReveal} disabled={loading} style={{ fontSize:'12px' }}>
              {loading ? 'Loading…' : 'Reveal'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommPrefsSection — controlled checkboxes with explicit Save
// ---------------------------------------------------------------------------
function CommPrefsSection({ profile }: { profile: Record<string,unknown> | undefined }) {
  const { toast } = useToast();
  const defaultPrefs = { email: true, sms: true, whatsapp: false, push: false };
  const [prefs, setPrefs] = useState(defaultPrefs);

  useEffect(() => {
    if (!profile) return;
    const stored = profile['communicationPrefs'] as Record<string,boolean> | undefined;
    if (stored) setPrefs({ ...defaultPrefs, ...stored });
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => api.customer.updateCommPrefs(prefs),
    onSuccess:  () => toast('Communication preferences saved.', 'success'),
    onError:    (err: ApiError) => toast(err.message ?? 'Save failed.', 'error'),
  });

  return (
    <div data-card-padded>
      <h3 style={{ fontSize:'13px', fontWeight:'600', marginBottom:'var(--space-4)' }}>Communication preferences</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
        {(['email','sms','whatsapp','push'] as const).map((ch) => (
          <label key={ch} data-checkbox-label style={{ justifyContent:'space-between' }}>
            <span>{{ email:'Email', sms:'SMS', whatsapp:'WhatsApp', push:'Push notifications' }[ch]}</span>
            <input
              type="checkbox"
              checked={!!prefs[ch]}
              onChange={(e) => setPrefs((prev) => ({ ...prev, [ch]: e.target.checked }))}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        data-btn-secondary
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={{ marginTop:'var(--space-4)' }}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save preferences'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------
export default function ProfilePage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab]               = useState<'profile'|'security'|'data'>('profile');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: profileKeys.me(),
    queryFn:  () => api.customer.getMe(),
    enabled:  !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (v: Record<string,unknown>) => api.customer.updateMe(v),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: profileKeys.me() }); toast('Profile updated.', 'success'); },
    onError:    (err: ApiError) => toast(err.message ?? 'Update failed.', 'error'),
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

  const form = useForm<Record<string,string>>({ defaultValues: { firstName:'', lastName:'', email:'' } });

  useEffect(() => {
    if (!profile) return;
    const p = profile as Record<string,unknown>;
    form.reset({ firstName: p['firstName'] as string ?? '', lastName: p['lastName'] as string ?? '', email: p['email'] as string ?? '' });
  }, [profile, form]);

  if (isLoading) return <div data-page><SkeletonLoader rows={5} /></div>;

  const p        = profile as Record<string,unknown> | undefined;
  const initials = `${(p?.['firstName'] as string)?.[0] ?? ''}${(p?.['lastName'] as string)?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div data-page>
      <h1 data-page-title>Profile</h1>

      {/* Avatar card */}
      <div style={{ display:'flex', alignItems:'center', gap:'var(--space-5)', marginBottom:'var(--space-6)', padding:'var(--space-6)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--color-primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700', flexShrink:0 }}>{initials}</div>
        <div>
          <div style={{ fontSize:'19px', fontWeight:'700' }}>{p?.['firstName'] as string} {p?.['lastName'] as string}</div>
          <div style={{ fontSize:'13px', color:'var(--color-text-secondary)', marginTop:4 }}>{p?.['email'] as string}</div>
          <div style={{ fontSize:'12px', color:'var(--color-text-muted)', marginTop:4, textTransform:'capitalize' }}>{(session?.role ?? '').replace(/_/g,' ')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div data-filter-tabs style={{ marginBottom:'var(--space-6)' }}>
        {([{id:'profile',label:'Personal info'},{id:'security',label:'Security'},{id:'data',label:'My data'}] as const).map((t) => (
          <button key={t.id} type="button" data-filter-tab data-active={tab===t.id?'':undefined} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Personal info */}
      {tab === 'profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
          <form onSubmit={form.handleSubmit((v) => void updateMutation.mutate(v))} noValidate style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-4)' }}>
              <div data-form-group>
                <label htmlFor="fn">First name</label>
                <input id="fn" type="text" autoComplete="given-name" {...form.register('firstName')} />
                <InlineError message={form.formState.errors['firstName']?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="ln">Last name</label>
                <input id="ln" type="text" autoComplete="family-name" {...form.register('lastName')} />
              </div>
            </div>
            <div data-form-group>
              <label htmlFor="em">Email address</label>
              <input id="em" type="email" autoComplete="email" {...form.register('email')} />
            </div>
            <button type="submit" disabled={updateMutation.isPending} data-btn-primary>
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          {/* Protected PII fields */}
          <div data-card-padded>
            <h3 style={{ fontSize:'13px', fontWeight:'600', color:'var(--color-text-secondary)', marginBottom:'var(--space-4)' }}>Protected information</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
              <RevealField fieldKey="phone"       label="Phone number"  inputType="tel"  onSave={(k, v) => updateMutation.mutate({ [k]: v })} isSaving={updateMutation.isPending} />
              <RevealField fieldKey="idNumber"    label="ID number"     inputType="text" onSave={(k, v) => updateMutation.mutate({ [k]: v })} isSaving={updateMutation.isPending} />
              <RevealField fieldKey="dateOfBirth" label="Date of birth" inputType="date" onSave={(k, v) => updateMutation.mutate({ [k]: v })} isSaving={updateMutation.isPending} />
            </div>
            <p style={{ fontSize:'12px', color:'var(--color-text-muted)', marginTop:'var(--space-4)' }}>
              These fields are masked for your security. Each reveal is logged and rate-limited.
            </p>
          </div>

          {/* Communication preferences */}
          <CommPrefsSection profile={p} />
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
          <div data-card-padded>
            <h3 style={{ fontSize:'14.5px', fontWeight:'700', marginBottom:'var(--space-3)' }}>Change password</h3>
            <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'var(--space-4)' }}>Changing your password signs out all other active sessions.</p>
            <Link href="/profile/password" data-btn-secondary>Change password →</Link>
          </div>
          <div data-card-padded>
            <h3 style={{ fontSize:'14.5px', fontWeight:'700', marginBottom:'var(--space-3)' }}>Connected accounts</h3>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                <span style={{ fontSize:'19px', fontWeight:'700', color:'#4285F4' }}>G</span>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:'600' }}>Google</div>
                  <div style={{ fontSize:'12px', color:'var(--color-text-secondary)' }}>{p?.['oAuthProvider']==='google'?'Connected':'Not connected'}</div>
                </div>
              </div>
              {p?.['oAuthProvider']!=='google' && <a href="/api/v1/auth/google" data-btn-secondary>Connect</a>}
            </div>
          </div>
        </div>
      )}

      {/* My data */}
      {tab === 'data' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
          <div data-card-padded>
            <h3 style={{ fontSize:'14.5px', fontWeight:'700', marginBottom:'var(--space-2)' }}>Export my data</h3>
            <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'var(--space-4)', lineHeight:'1.65' }}>
              Download a copy of your personal data — profile, bookings, payments, reviews, complaints, loyalty account, and all consent records held for your account.
            </p>
            {exportDone ? (
              <div style={{ padding:'var(--space-4)', background:'var(--color-success-bg)', borderRadius:'var(--radius-md)', fontSize:'13px', color:'var(--color-success)', fontWeight:'500', display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                <Icons.CheckCircle2 size={16} /> Export requested. You will receive an email with a download link within 24 hours.
              </div>
            ) : (
              <button type="button" data-btn-secondary disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
                {exportMutation.isPending ? 'Requesting…' : 'Request data export'}
              </button>
            )}
          </div>

          <div data-card-padded style={{ borderColor:'var(--color-danger)' }}>
            <h3 style={{ fontSize:'14.5px', fontWeight:'700', color:'var(--color-danger)', marginBottom:'var(--space-2)' }}>Delete account</h3>
            <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'var(--space-2)', lineHeight:'1.65' }}>
              Deleting your account deactivates it immediately and revokes all active sessions. Personal data is removed from active records within 30 days.
            </p>
            <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'var(--space-4)', lineHeight:'1.65' }}>
              <strong>Note:</strong> A record of your consent history is retained permanently as required for compliance purposes, even after deletion. This cannot be removed.
            </p>
            <button type="button" data-btn-ghost style={{ color:'var(--color-danger)', borderColor:'var(--color-danger)' }} onClick={() => setDeleteOpen(true)}>
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
