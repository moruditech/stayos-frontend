'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge, DownloadButton, useToast, Icons } from '@stayos/ui';
import { leaseKeys } from '@/lib/query-keys';

interface Props { params: { id: string } }

export default function LeaseDetailPage({ params }: Props): React.ReactElement {
  const session = useSession();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { toast } = useToast();
  const [signatureInput, setSignatureInput] = useState('');
  const [signing, setSigning]               = useState(false);

  const { data: lease, isLoading } = useQuery({
    queryKey: leaseKeys.detail(params.id),
    queryFn:  () => api.university.getLease(params.id),
    enabled:  !!session,
  });

  const signMutation = useMutation({
    mutationFn: () => api.university.signLease(params.id, { signature: signatureInput }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaseKeys.detail(params.id) });
      qc.invalidateQueries({ queryKey: leaseKeys.list() });
      toast('Lease signed successfully.', 'success');
      setSigning(false);
    },
    onError: (err: ApiError) => toast(err.message ?? 'Signing failed.', 'error'),
  });

  if (isLoading) return <div data-page><SkeletonLoader rows={4} /></div>;
  const l = lease as Record<string, unknown> | undefined;
  if (!l) return <div data-page><p>Lease not found.</p></div>;

  const status    = l['status'] as string;
  const needsSign = status === 'issued';
  const docUrl    = api.university.getLeaseDocument(params.id);
  const start     = new Date(l['startDate'] as string);
  const end       = new Date(l['endDate'] as string);

  return (
    <div data-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to leases
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 data-page-title style={{ marginBottom: 'var(--space-1)' }}>Lease agreement</h1>
          <p data-page-subtitle>{l['propertyName'] as string}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div data-card-padded style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          {[
            { label: 'Lease period', value: `${start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} – ${end.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}` },
            { label: 'Monthly rent',  value: `R${((l['monthlyRent'] as number) ?? 0).toLocaleString()}` },
            { label: 'Room',          value: (l['roomName'] as string) ?? '—' },
            l['signedAt'] ? { label: 'Signed on', value: new Date(l['signedAt'] as string).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) } : null,
          ].filter(Boolean).map((item) => item && (
            <div key={item.label}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <DownloadButton href={docUrl} filename={`lease-${params.id}.pdf`} label="Download lease document" />

      {needsSign && (
        <div data-card-padded style={{ marginTop: 'var(--space-5)', borderColor: 'var(--color-primary)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.PenLine size={18} /> Digital signature required
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Please review the lease document above and sign below to confirm your acceptance.
          </p>
          {!signing ? (
            <button type="button" data-btn-primary data-btn-full onClick={() => setSigning(true)}>
              Sign lease
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div data-form-group>
                <label htmlFor="sig">Type your full name as your signature</label>
                <input id="sig" type="text" placeholder="Full legal name" value={signatureInput} onChange={(e) => setSignatureInput(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="button" data-btn-ghost style={{ flex: 1 }} onClick={() => setSigning(false)}>Cancel</button>
                <button type="button" data-btn-primary style={{ flex: 2 }}
                  disabled={!signatureInput.trim() || signMutation.isPending}
                  onClick={() => signMutation.mutate()}>
                  {signMutation.isPending ? 'Signing…' : 'Confirm signature'}
                </button>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                By signing, you confirm you have read the lease agreement and agree to its terms. This signature is legally binding.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
