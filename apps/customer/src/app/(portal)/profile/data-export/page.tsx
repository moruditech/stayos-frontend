'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { useToast, Icons } from '@stayos/ui';

// GET /customers/me/data-export — POPIA DSAR per TAD 07 §5
export default function DataExportPage(): React.ReactElement {
  const session   = useSession();
  const { toast } = useToast();
  const [done, setDone] = useState(false);

  const exportMutation = useMutation({
    mutationFn: () => api.customer.requestDataExport(),
    onSuccess: () => setDone(true),
    onError: (err: ApiError) => toast(err.message ?? 'Export request failed.', 'error'),
  });

  if (!session) return <></>;

  const WHAT_IS_INCLUDED = [
    'Profile information (name, email, phone, date of birth)',
    'All booking records',
    'Payment and invoice history',
    'Student applications, leases and invoices',
    'Complaint submissions',
    'Reviews written',
    'Loyalty account and transaction history',
    'Wishlist',
    'Communication preferences',
    'Notification history',
    'Data-sharing consent records',
    'Audit log of reveal actions (PII field access)',
  ];

  return (
    <div data-page>
      <Link href="/profile" data-link style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', fontSize:'var(--text-sm)', marginBottom:'var(--space-5)', textDecoration:'none', color:'var(--color-text-secondary)' }}>
        <Icons.ChevronLeft size={16} /> Back to profile
      </Link>

      <h1 data-page-title>Export my data</h1>
      <p data-page-subtitle>Download a copy of everything StayOS holds about you (POPIA DSAR)</p>

      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)', maxWidth:560 }}>
        <div data-card-padded>
          <h2 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-4)' }}>
            What&apos;s included in your export
          </h2>
          <ul style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
            {WHAT_IS_INCLUDED.map((item) => (
              <li key={item} style={{ display:'flex', gap:'var(--space-2)', fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
                <span style={{ color:'var(--color-primary)', flexShrink:0, display:'flex' }}><Icons.Check size={16} /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div data-card-padded style={{ background:'var(--color-surface-muted)' }}>
          <h3 style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-semibold)', marginBottom:'var(--space-2)' }}>
            How it works
          </h3>
          <ol style={{ paddingLeft:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-2)', fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
            <li>Click the button below to request your data export.</li>
            <li>We compile your data into a machine-readable format (JSON + CSV).</li>
            <li>You receive an email with a secure download link within <strong>24 hours</strong>.</li>
            <li>The download link is valid for 7 days.</li>
          </ol>
        </div>

        {done ? (
          <div style={{ padding:'var(--space-6)', background:'var(--color-success-bg)', borderRadius:'var(--radius-lg)', textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', color:'var(--color-success)', marginBottom:'var(--space-3)' }}><Icons.CheckCircle2 size={32} /></div>
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', color:'var(--color-success)', marginBottom:'var(--space-2)' }}>
              Export requested
            </h3>
            <p style={{ fontSize:'var(--text-sm)', color:'var(--color-success)' }}>
              You will receive an email at <strong>{session.userId}</strong> with a download link within 24 hours.
            </p>
          </div>
        ) : (
          <button type="button" data-btn-primary data-btn-full
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}>
            {exportMutation.isPending ? 'Requesting export…' : 'Request data export'}
          </button>
        )}

        <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', lineHeight:'var(--leading-relaxed)' }}>
          This is your right under the Protection of Personal Information Act 4 of 2013 (POPIA). If you have questions, contact our Information Officer at privacy@stayos.co.za.
        </p>
      </div>
    </div>
  );
}
