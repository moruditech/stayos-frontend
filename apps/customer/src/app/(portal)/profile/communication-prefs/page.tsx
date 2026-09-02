'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, useToast, Icons, type LucideIcon } from '@stayos/ui';
import { profileKeys } from '@/lib/query-keys';

// PATCH /customers/me/communication-prefs
// Fields: email, sms, whatsapp, push — all boolean, all optional
// Confirmed against commPrefsSchema in customers.routes.js
type Channel = 'email' | 'sms' | 'whatsapp' | 'push';

const CHANNELS: { id: Channel; label: string; desc: string; icon: LucideIcon }[] = [
  { id:'email',    label:'Email',            desc:'Booking confirmations, receipts, application updates and newsletters.', icon:Icons.Mail },
  { id:'sms',      label:'SMS',              desc:'Booking reminders and urgent account alerts. Standard message rates apply.', icon:Icons.MessageCircle },
  { id:'whatsapp', label:'WhatsApp',         desc:'Booking updates and support messages via WhatsApp.', icon:Icons.Smartphone },
  { id:'push',     label:'Push notifications', desc:'Real-time alerts on your device when using the StayOS app.', icon:Icons.Bell },
];

export default function CommPrefsPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: profileKeys.me(),
    queryFn:  () => api.customer.getMe(),
    enabled:  !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (prefs: Record<string, boolean>) => api.customer.updateCommPrefs(prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      toast('Preferences saved.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to save preferences.', 'error'),
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={4} /></div>;

  const p     = profile as Record<string, unknown> | undefined;
  const prefs = (p?.['commPrefs'] as Record<string, boolean>) ?? {};

  function handleToggle(channel: Channel, checked: boolean): void {
    updateMutation.mutate({ [channel]: checked });
  }

  return (
    <div data-page>
      <Link href="/profile" data-link style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', fontSize:'13px', marginBottom:'var(--space-5)', textDecoration:'none', color:'var(--color-text-secondary)' }}>
        <Icons.ChevronLeft size={16} /> Back to profile
      </Link>

      <h1 data-page-title>Communication preferences</h1>
      <p data-page-subtitle>Choose how you&apos;d like us to contact you</p>

      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)', maxWidth:560 }}>
        <div data-card-padded style={{ background:'var(--color-primary-tint)' }}>
          <p style={{ fontSize:'13px', color:'var(--color-primary)' }}>
            <strong>Transactional messages</strong> (booking confirmations, payment receipts, application updates, password resets, and security alerts) are always sent regardless of these preferences — they are required for the service to function.
          </p>
        </div>

        <div data-card-padded>
          <h2 style={{ fontSize:'14.5px', fontWeight:'700', marginBottom:'var(--space-5)' }}>
            Marketing and non-essential communications
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap: 0 }}>
            {CHANNELS.map((ch, i) => {
              const enabled = prefs[ch.id] ?? false;
              return (
                <div key={ch.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  gap:'var(--space-4)', padding:'var(--space-5) 0',
                  borderBottom: i < CHANNELS.length-1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-4)' }}>
                    <span style={{ width:40, height:40, background:'var(--color-bg-sunk)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'var(--color-primary)' }}><ch.icon size={20} /></span>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:4 }}>{ch.label}</div>
                      <div style={{ fontSize:'12px', color:'var(--color-text-secondary)', lineHeight:'1.65' }}>{ch.desc}</div>
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button type="button"
                    role="switch" aria-checked={enabled}
                    disabled={updateMutation.isPending}
                    onClick={() => handleToggle(ch.id, !enabled)}
                    style={{
                      width:48, height:26, borderRadius:13, flexShrink:0, cursor:'pointer',
                      background: enabled ? 'var(--color-primary)' : 'var(--color-border)',
                      border:'none', position:'relative', transition:'background 200ms',
                    }}>
                    <span style={{
                      position:'absolute', top:3, left: enabled ? 25 : 3,
                      width:20, height:20, borderRadius:'50%', background:'white',
                      transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                    <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <p style={{ fontSize:'12px', color:'var(--color-text-muted)', lineHeight:'1.65' }}>
          You can unsubscribe from marketing emails at any time by clicking the unsubscribe link in any email. Changes take effect within 24 hours. For more information, see our{' '}
          <Link href="/legal/privacy" data-link>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
