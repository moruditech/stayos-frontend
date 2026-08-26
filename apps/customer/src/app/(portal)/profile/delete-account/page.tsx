'use client';
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { useSessionContext } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { ConfirmDialog, useToast, Icons } from '@stayos/ui';

// DELETE /customers/me — POPIA erasure per TAD 07 §4
// Copy is honest: DataSharingConsent is hard-retained permanently (no deletedAt on the model).
// "all your data has been permanently deleted" would be factually wrong and is never displayed.
export default function DeleteAccountPage(): React.ReactElement {
  const session         = useSession();
  const { clearSession } = useSessionContext();
  const { toast }       = useToast();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => api.customer.deleteAccount(),
    onSuccess: () => {
      clearSession();
      window.location.href = '/login?deleted=1';
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Deletion failed. Please try again or contact support.', 'error');
      setOpen(false);
    },
  });

  if (!session) return <></>;

  return (
    <div data-page>
      <a href="/profile" data-link style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', fontSize:'var(--text-sm)', marginBottom:'var(--space-5)', textDecoration:'none', color:'var(--color-text-secondary)' }}>
        <Icons.ChevronLeft size={16} /> Back to profile
      </a>

      <h1 data-page-title>Delete account</h1>
      <p data-page-subtitle>Permanently deactivate your StayOS account</p>

      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)', maxWidth:560 }}>

        {/* What happens */}
        <div data-card-padded>
          <h2 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-4)' }}>
            What happens when you delete your account
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
            {[
              { icon:Icons.Lock, label:'Immediate effects', items:[
                'Your account is deactivated immediately.',
                'All active sessions are revoked across all devices.',
                'You will be signed out of the platform.',
              ]},
              { icon:Icons.Calendar, label:'Within 30 days', items:[
                'Your profile, booking history, payment records and personal data are removed from active records.',
                'Your reviews and complaints are anonymised — the content may remain visible but will no longer be linked to your identity.',
              ]},
              { icon:Icons.ClipboardList, label:'Retained permanently (required by law)', items:[
                'A record of data-sharing consents you gave is retained permanently. This cannot be removed — it is required to demonstrate the lawfulness of processing that occurred under each consent, in accordance with POPIA and in the event of a dispute. This record does not identify you by name after your account is deleted.',
                'Financial transaction records are retained for 5 years as required by South African financial regulations.',
              ]},
            ].map((section) => (
              <div key={section.label}>
                <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)', marginBottom:'var(--space-2)' }}>
                  <span style={{ display: 'flex', color: 'var(--color-primary)' }}><section.icon size={16} /></span>{section.label}
                </div>
                <ul style={{ paddingLeft:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-1)' }}>
                  {section.items.map((item) => (
                    <li key={item} style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Things to do first */}
        <div data-card-padded style={{ background:'var(--color-warning-bg)', borderColor:'var(--color-warning)' }}>
          <h3 style={{ fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', color:'var(--color-warning)', marginBottom:'var(--space-3)', display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
            <Icons.AlertTriangle size={16} /> Before you delete
          </h3>
          <ul style={{ paddingLeft:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-2)', fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
            <li>Make sure you have no upcoming bookings — deletion will not automatically cancel them.</li>
            <li>Download your data export first if you want a copy of your records.</li>
            <li>Outstanding payments will still need to be settled with the relevant property.</li>
          </ul>
          <div style={{ display:'flex', gap:'var(--space-3)', marginTop:'var(--space-4)', flexWrap:'wrap' }}>
            <a href="/bookings?status=upcoming" data-btn-ghost style={{ fontSize:'var(--text-sm)' }}>Check upcoming bookings</a>
            <a href="/profile/data-export" data-btn-ghost style={{ fontSize:'var(--text-sm)' }}>Export my data first</a>
          </div>
        </div>

        {/* Confirm checkbox */}
        <label data-checkbox-label style={{ alignItems:'flex-start', gap:'var(--space-3)' }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop:3 }} />
          <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
            I understand that deleting my account is permanent. I have read the information above and I want to proceed.
          </span>
        </label>

        <button type="button"
          disabled={!confirmed || deleteMutation.isPending}
          onClick={() => setOpen(true)}
          style={{
            padding:'var(--space-4)', background: confirmed ? 'var(--color-error)' : 'var(--color-surface-muted)',
            color: confirmed ? 'white' : 'var(--color-text-muted)',
            border: 'none', borderRadius:'var(--radius-md)', fontWeight:'var(--font-semibold)',
            fontSize:'var(--text-base)', cursor: confirmed ? 'pointer' : 'not-allowed', transition:'all var(--transition-fast)',
          }}>
          Delete my account
        </button>
      </div>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        message={`Your account for ${session.userId} will be deactivated immediately and personal data removed within 30 days. Consent records and financial transaction records are retained as required by law. This cannot be undone.`}
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Yes, permanently delete my account'}
        cancelLabel="Keep my account"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
